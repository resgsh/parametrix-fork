use cardano/assets.{from_asset}
use mocktail.{
  complete, mint, mocktail_tx, required_signer_hash, tx_out, tx_out_inline_datum,
}
use mocktail/virgin_address.{mock_pub_key_address, mock_script_address}
use mocktail/virgin_key_hash.{mock_policy_id, mock_pub_key_hash}
use registry
use test_types.{stable_assetname, stable_policy_id}
use types.{AssetClass, ContributionDatum, PoolDatum}

test success_registry_mint_valid() {
  let hedger_addr = mock_pub_key_address(0, None)
  let hedger_pkh = mock_pub_key_hash(0)
  let fee_addr = mock_pub_key_address(1, None)
  let fee_percentage = 5

  let policy_id = mock_policy_id(0)
  let pool_id = "pool-1"

  let script_address = mock_script_address(0, None)

  let payment_asset =
    AssetClass { asset_id: stable_policy_id, asset_name: stable_assetname }

  let coverage_target = 1_000_000_000
  let premium_bps = 500

  let premium = coverage_target * premium_bps / 10_000

  let premium_value =
    from_asset(payment_asset.asset_id, payment_asset.asset_name, premium)

  let pool_token_value = from_asset(policy_id, pool_id, 1)

  let pool_datum =
    PoolDatum {
      pool_id,
      hedger: hedger_addr,
      payment_asset,
      coverage_target,
      premium_bps,
      subscription_start: 0,
      subscription_end: 0,
      event_time: 0,
      settlement_time: 0,
      fee_addr,
      fee_percentage,
      event_type: "RAINFALL_EXCEEDED",
      event_threshold: 100,
    }

  let premium_datum =
    ContributionDatum {
      owner: hedger_addr,
      amount: premium,
      amount_type: "PREMIUM",
    }

  let tx =
    mocktail_tx()
      |> mint(True, 1, policy_id, pool_id)
      // pool NFT output (with PoolDatum)
      |> tx_out(True, script_address, pool_token_value)
      |> tx_out_inline_datum(True, pool_datum)
      // premium UTxO (separate, with ContributionDatum)
      |> tx_out(True, script_address, premium_value)
      |> tx_out_inline_datum(True, premium_datum)
      |> required_signer_hash(True, hedger_pkh)
      |> complete()

  registry.registry.mint(fee_addr, payment_asset, pool_id, policy_id, tx)
}

test fail_registry_wrong_premium() {
  let hedger_addr = mock_pub_key_address(0, None)
  let hedger_pkh = mock_pub_key_hash(0)
  let fee_addr = mock_pub_key_address(1, None)
  let fee_percentage = 5

  let policy_id = mock_policy_id(0)
  let pool_id = "pool-1"
  let script_address = mock_script_address(0, None)

  let payment_asset =
    AssetClass { asset_id: stable_policy_id, asset_name: stable_assetname }

  let coverage_target = 1_000_000_000
  let premium_bps = 500

  let wrong_premium = 1

  let pool_token_value = from_asset(policy_id, pool_id, 1)
  let premium_value =
    from_asset(payment_asset.asset_id, payment_asset.asset_name, wrong_premium)

  let pool_datum =
    PoolDatum {
      pool_id,
      hedger: hedger_addr,
      payment_asset,
      coverage_target,
      premium_bps,
      subscription_start: 0,
      subscription_end: 0,
      event_time: 0,
      settlement_time: 0,
      fee_addr,
      fee_percentage,
      event_type: "RAINFALL_EXCEEDED",
      event_threshold: 100,
    }

  let premium_datum =
    ContributionDatum {
      owner: hedger_addr,
      amount: wrong_premium,
      amount_type: "PREMIUM",
    }

  let tx =
    mocktail_tx()
      |> mint(True, 1, policy_id, pool_id)
      |> tx_out(True, script_address, pool_token_value)
      |> tx_out_inline_datum(True, pool_datum)
      |> tx_out(True, script_address, premium_value)
      |> tx_out_inline_datum(True, premium_datum)
      |> required_signer_hash(True, hedger_pkh)
      |> complete()

  !registry.registry.mint(fee_addr, payment_asset, pool_id, policy_id, tx)
}

test fail_registry_missing_hedger_sign() {
  let hedger_addr = mock_pub_key_address(0, None)
  let hedger_pkh = mock_pub_key_hash(0)
  let fee_addr = mock_pub_key_address(1, None)
  let fee_percentage = 5

  let policy_id = mock_policy_id(0)
  let pool_id = "pool-1"
  let script_address = mock_script_address(0, None)

  let payment_asset =
    AssetClass { asset_id: stable_policy_id, asset_name: stable_assetname }

  let coverage_target = 1_000_000_000
  let premium_bps = 500

  let premium = coverage_target * premium_bps / 100

  let pool_token_value = from_asset(policy_id, pool_id, 1)
  let premium_value =
    from_asset(payment_asset.asset_id, payment_asset.asset_name, premium)

  let pool_datum =
    PoolDatum {
      pool_id,
      hedger: hedger_addr,
      payment_asset,
      coverage_target,
      premium_bps,
      subscription_start: 0,
      subscription_end: 0,
      event_time: 0,
      settlement_time: 0,
      fee_addr,
      fee_percentage,
      event_type: "RAINFALL_EXCEEDED",
      event_threshold: 100,
    }

  let premium_datum =
    ContributionDatum {
      owner: hedger_addr,
      amount: premium,
      amount_type: "PREMIUM",
    }

  let tx =
    mocktail_tx()
      |> mint(True, 1, policy_id, pool_id)
      |> tx_out(True, script_address, pool_token_value)
      |> tx_out_inline_datum(True, pool_datum)
      |> tx_out(True, script_address, premium_value)
      |> tx_out_inline_datum(True, premium_datum)
      |> required_signer_hash(False, hedger_pkh)
      |> complete()

  !registry.registry.mint(fee_addr, payment_asset, pool_id, policy_id, tx)
}
