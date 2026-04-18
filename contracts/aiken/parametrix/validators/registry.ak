use cardano/address.{Address}
use cardano/assets.{PolicyId, quantity_of}
use cardano/transaction.{InlineDatum, Transaction}
use cocktail/vodka_address.{address_pub_key, address_script_hash}
use cocktail/vodka_extra_signatories.{key_signed}
use cocktail/vodka_mints.{only_minted_token}
use cocktail/vodka_outputs.{outputs_with}
use cocktail/vodka_value.{get_all_value_to}
use types.{AssetClass, PoolDatum}

pub type Action {
  Update
}

validator registry(v_fee_addr: Address, v_payment_asset: AssetClass) {
  mint(redeemer: ByteArray, policy_id: PolicyId, tx: Transaction) {
    let Transaction { outputs, extra_signatories, mint, .. } = tx

    expect [pool_out] = outputs_with(tx.outputs, policy_id, redeemer)
    expect InlineDatum(pool_datum) = pool_out.datum
    expect PoolDatum {
      hedger,
      fee_addr,
      pool_id,
      payment_asset,
      coverage_target,
      premium_bps,
      ..
    } = pool_datum
    expect redeemer == pool_id
    expect Some(hedger_pub_key) = address_pub_key(hedger)
    let premium_paid =
      (
        get_all_value_to(outputs, pool_out.address)
          |> quantity_of(payment_asset.asset_id, payment_asset.asset_name)
      ) == coverage_target * premium_bps / 10_000
    key_signed(extra_signatories, hedger_pub_key) && premium_paid && v_fee_addr == fee_addr && v_payment_asset == payment_asset && only_minted_token(
      mint,
      policy_id,
      redeemer,
      1,
    )
  }

  else(_) {
    fail
  }
}
