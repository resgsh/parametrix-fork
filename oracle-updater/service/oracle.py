import asyncio
from pathlib import Path
import json

from charli3_odv_client.config import ODVClientConfig, ReferenceScriptConfig
from charli3_odv_client.core.client import ODVClient
from charli3_odv_client.models.requests import (
    OdvFeedRequest,
    OdvTxSignatureRequest,
)
from charli3_odv_client.models.base import TxValidityInterval
from charli3_odv_client.cli.utils.shared import (
    create_chain_query,
    setup_transaction_builder,
)
from charli3_odv_client.config.keys import KeyManager


CONFIG_PATH = Path("config/config.yaml")


# --- Shared Setup (CRITICAL: reuse everywhere) ---
def setup():
    config = ODVClientConfig.from_yaml(CONFIG_PATH)
    ref_config = ReferenceScriptConfig.from_yaml(CONFIG_PATH)

    client = ODVClient()
    chain_query = create_chain_query(config)

    tx_manager, tx_builder = setup_transaction_builder(
        config, ref_config, chain_query
    )

    signing_key, _, _, change_address = KeyManager.load_from_config(
        config.wallet
    )

    return config, client, tx_manager, tx_builder, change_address, signing_key


# HELPER
def save_feeds_to_file(node_messages, path="feeds.json"):
    data = {
        str(pub_key): msg.model_dump(mode="json")
        for pub_key, msg in node_messages.items()
    }

    Path(path).write_text(json.dumps(data, indent=2))

# --- FEEDS ---
async def fetch_feeds(save=False):
    config, client, tx_manager, _, _, _ = setup()

    # ✅ Correct: chain-based validity
    validity_window = tx_manager.calculate_validity_window(
        config.odv_validity_length
    )

    feed_request = OdvFeedRequest(
        oracle_nft_policy_id=config.policy_id,
        tx_validity_interval=TxValidityInterval(
            start=validity_window.validity_start,
            end=validity_window.validity_end,
        ),
    )

    node_messages = await client.collect_feed_updates(
        nodes=config.nodes,
        feed_request=feed_request,
    )

    if save:
        save_feeds_to_file(node_messages)

    return {
        "count": len(node_messages),
        "node_messages": node_messages,
    }

async def aggregate():
    config, client, tx_manager, tx_builder, change_address, signing_key = setup()

    # Step 0: validity window (chain-aligned)
    validity_window = tx_manager.calculate_validity_window(
        config.odv_validity_length
    )

    # Step 1: fetch feeds
    feed_request = OdvFeedRequest(
        oracle_nft_policy_id=config.policy_id,
        tx_validity_interval=TxValidityInterval(
            start=validity_window.validity_start,
            end=validity_window.validity_end,
        ),
    )

    node_messages = await client.collect_feed_updates(
        nodes=config.nodes,
        feed_request=feed_request,
    )

    if not node_messages:
        raise Exception("No node responses")

    # Step 2: build tx
    odv_result = await tx_builder.build_odv_tx(
        node_messages=node_messages,
        signing_key=signing_key,
        change_address=change_address,
        validity_window=validity_window,
    )

    # Step 3: collect signatures
    tx_request = OdvTxSignatureRequest(
        node_messages=node_messages,
        tx_body_cbor=odv_result.transaction.transaction_body.to_cbor_hex(),
    )

    signatures = await client.collect_tx_signatures(
        nodes=config.nodes,
        tx_request=tx_request,
    )

    if not signatures:
        raise Exception("No signatures collected")

    # Step 4: attach witnesses
    final_tx = client.attach_signature_witnesses(
        odv_result.transaction,
        signatures,
        node_messages,
    )

    # Step 5: sign + submit
    status, submitted_tx = await tx_manager.sign_and_submit(
        final_tx,
        signing_keys=[signing_key],
        wait_confirmation=True,
    )

    if status != "confirmed":
        raise Exception(f"Transaction failed with status: {status}")

    return {
        "tx_id": str(final_tx.id),
        "median": odv_result.median_value,
        "signatures": len(signatures),
        "submitted": True,
    }