use aiken/collection/list
use cardano/address.{Address}
use cardano/assets.{PolicyId, quantity_of}
use cardano/transaction.{
  InlineDatum, Input, OutputReference, Transaction, find_input,
}
use cocktail/vodka_inputs.{inputs_with_policy}
use cocktail/vodka_mints.{only_minted_token}
use cocktail/vodka_outputs.{outputs_at}
use cocktail/vodka_validity_range.{valid_after, valid_before}
use cocktail/vodka_value.{get_all_value_to}
use oracle_datum.{OracleDatum, get_oracle_price, is_oracle_valid}
use types.{ContributionData, ContributionDatum, PoolDatum}

pub type Action {
  Subscribe
  // LP subscription (lock capital)
  SettlePool
}

validator parametrix(
  reg_policy_id: PolicyId,
  oracle_policy_id: PolicyId,
  v_hedger: Address,
  v_pool_id: ByteArray,
) {
  mint(redeemer: Action, policy_id: PolicyId, tx: Transaction) {
    let Transaction { reference_inputs, outputs, mint, validity_range, .. } = tx

    when redeemer is {
      Subscribe -> {
        expect [ref_in] = reference_inputs |> inputs_with_policy(reg_policy_id)

        expect InlineDatum(reg_datum) = ref_in.output.datum
        expect PoolDatum {
          pool_id,
          payment_asset,
          subscription_start,
          subscription_end,
          ..
        } = reg_datum

        expect and {
            pool_id == v_pool_id,
            valid_after(validity_range, subscription_start),
            valid_before(validity_range, subscription_end),
          }

        let pool_addr = ref_in.output.address

        expect [pool_out] = outputs |> outputs_at(pool_addr)

        let deposited =
          pool_out.value
            |> quantity_of(payment_asset.asset_id, payment_asset.asset_name)

        let subscribed_units = deposited / 10_000_000

        and {
          deposited > 0,
          only_minted_token(mint, policy_id, "sPMX", subscribed_units),
        }
      }
      _ -> False
    }
  }

  spend(
    _datum_opt: Option<ContributionData>,
    redeemer: Action,
    oref: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, reference_inputs, validity_range, .. } =
      tx

    expect [reg_ref_in] = reference_inputs |> inputs_with_policy(reg_policy_id)

    expect InlineDatum(ref_datum) = reg_ref_in.output.datum
    expect PoolDatum {
      pool_id,
      hedger,
      payment_asset,
      settlement_time,
      subscription_start,
      subscription_end,
      premium_bps,
      event_type,
      event_threshold,
      ..
    } = ref_datum

    expect Some(own_input) = find_input(inputs, oref)
    let own_address = own_input.output.address
    expect and {
        pool_id == v_pool_id,
        valid_after(validity_range, subscription_start),
        valid_before(validity_range, subscription_end),
        own_address == reg_ref_in.output.address,
        hedger == v_hedger,
      }

    when redeemer is {
      SettlePool -> {
        // --- 4. Contribution datum
        expect InlineDatum(raw_input_datum) = own_input.output.datum
        expect ContributionData { data_list } = raw_input_datum
        // --- 5. Oracle
        expect [oracle_ref] =
          reference_inputs |> inputs_with_policy(oracle_policy_id)
        expect InlineDatum(raw_oracle_datum) = oracle_ref.output.datum
        expect oracle_datum: OracleDatum = raw_oracle_datum
        let price = get_oracle_price(oracle_datum)
        // let oracle_timestamp = get_oracle_timestamp(oracle_datum)
        let oracle_valid = is_oracle_valid(oracle_datum, settlement_time)

        let event_occured =
          when event_type is {
            "RAINFALL_EXCEEDED" -> price > event_threshold
            //50 cm, 100 cm
            "FLIGHT_DELAY" -> price > event_threshold
            //180 minutes, 2000 minutes
            _ -> False
          }

        let is_correct_amount_split =
          if !event_occured {
            // NO EVENT → subscriber gets principal + premium
            list.all(
              data_list,
              fn(ContributionDatum { owner, amount, amount_type }) {
                if amount_type == "SUBSCRIBER" {
                  let payout =
                    get_all_value_to(outputs, owner)
                      |> quantity_of(
                          payment_asset.asset_id,
                          payment_asset.asset_name,
                        )
                  let expected = amount + amount * premium_bps / 10_000
                  payout == expected
                } else {
                  True
                }
              },
            )
          } else {
            // EVENT → hedger gets principal, subscribers get premium
            let total_principal =
              list.foldr(
                data_list,
                0,
                fn(ContributionDatum { amount, amount_type, .. }, acc) {
                  if amount_type == "SUBSCRIBER" {
                    acc + amount
                  } else {
                    acc
                  }
                },
              )
            let hedger_correct =
              (
                get_all_value_to(outputs, hedger)
                  |> quantity_of(
                      payment_asset.asset_id,
                      payment_asset.asset_name,
                    )
              ) == total_principal
            let subscriber_correct =
              list.all(
                data_list,
                fn(ContributionDatum { owner, amount, amount_type }) {
                  if amount_type == "SUBSCRIBER" {
                    let payout =
                      get_all_value_to(outputs, owner)
                        |> quantity_of(
                            payment_asset.asset_id,
                            payment_asset.asset_name,
                          )
                    let expected = amount * premium_bps / 10_000
                    payout == expected
                  } else {
                    True
                  }
                },
              )
            hedger_correct && subscriber_correct
          }
        valid_after(validity_range, settlement_time)? && is_correct_amount_split? && oracle_valid?
      }
      _ -> False
    }
  }

  else(_) {
    fail
  }
}
