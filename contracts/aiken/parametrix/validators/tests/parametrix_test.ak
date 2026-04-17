use cardano/assets.{from_asset}
use cardano/transaction.{InlineDatum, Input, Output}
use mocktail.{
  add_input, add_reference_input, complete, invalid_before, invalid_hereafter,
  mint, mocktail_tx, tx_out,
}
use mocktail/virgin_address.{mock_pub_key_address, mock_script_address}
use mocktail/virgin_key_hash.{mock_policy_id}
use mocktail/virgin_output_reference.{mock_utxo_ref}
use oracle_datum.{create_oracle_datum}
use parametrix.{SettlePool, Subscribe}
use test_types.{stable_assetname, stable_policy_id}
use types.{AssetClass, ContributionData, ContributionDatum, PoolDatum}

const policy_id = mock_policy_id(0)

const reg_policy_id = mock_policy_id(1)

const oracle_policy_id = mock_policy_id(2)

const script_address = mock_script_address(0, None)

const pool_id = "pool-1"

const event_type = "RAINFALL_EXCEEDED"

test subscribe_valid() {
  let payment_asset =
    AssetClass { asset_id: stable_policy_id, asset_name: stable_assetname }

  let deposit = 20_000_000
  let units = deposit / 10_000_000

  let pool_datum =
    PoolDatum {
      pool_id,
      hedger: mock_pub_key_address(9, None),
      payment_asset,
      coverage_target: 0,
      premium_bps: 500,
      subscription_start: 100,
      subscription_end: 1_000,
      event_time: 0,
      settlement_time: 2_000,
      fee_addr: mock_pub_key_address(2, None),
      pool_addr: script_address,
      fee_percentage: 5,
      event_type,
      event_threshold: 50,
    }

  let tx =
    mocktail_tx()
      |> mint(True, units, policy_id, "sPMX")
      |> tx_out(
          True,
          script_address,
          from_asset(payment_asset.asset_id, payment_asset.asset_name, deposit),
        )
      |> invalid_before(True, 101)
      |> invalid_hereafter(True, 999)
      |> complete()
      |> add_reference_input(
          True,
          Input {
            output_reference: mock_utxo_ref(0, 0),
            output: Output {
              address: script_address,
              value: from_asset(reg_policy_id, pool_id, 1),
              datum: InlineDatum(pool_datum),
              reference_script: None,
            },
          },
        )

  parametrix.parametrix.mint(
    reg_policy_id,
    oracle_policy_id,
    mock_pub_key_address(9, None),
    pool_id,
    Subscribe,
    policy_id,
    tx,
  )
}

test subscribe_fail_wrong_units() {
  let payment_asset =
    AssetClass { asset_id: stable_policy_id, asset_name: stable_assetname }

  let deposit = 20_000_000

  let pool_datum =
    PoolDatum {
      pool_id,
      hedger: mock_pub_key_address(9, None),
      payment_asset,
      coverage_target: 0,
      premium_bps: 500,
      subscription_start: 100,
      subscription_end: 1_000,
      event_time: 0,
      settlement_time: 2_000,
      fee_addr: mock_pub_key_address(2, None),
      pool_addr: script_address,
      fee_percentage: 5,
      event_type,
      event_threshold: 50,
    }

  let tx =
    mocktail_tx()
      |> mint(True, 1, policy_id, "sPMX")
      |> tx_out(
          True,
          script_address,
          from_asset(payment_asset.asset_id, payment_asset.asset_name, deposit),
        )
      |> invalid_before(True, 101)
      |> invalid_hereafter(True, 999)
      |> complete()
      |> add_reference_input(
          True,
          Input {
            output_reference: mock_utxo_ref(0, 0),
            output: Output {
              address: script_address,
              value: from_asset(reg_policy_id, pool_id, 1),
              datum: InlineDatum(pool_datum),
              reference_script: None,
            },
          },
        )

  !parametrix.parametrix.mint(
    reg_policy_id,
    oracle_policy_id,
    mock_pub_key_address(9, None),
    pool_id,
    Subscribe,
    policy_id,
    tx,
  )
}

test settle_success_event_occured_correct_split() {
  let hedger = mock_pub_key_address(9, None)
  let subscriber = mock_pub_key_address(0, None)

  let oracle_address = mock_script_address(2, None)

  let payment_asset =
    AssetClass { asset_id: stable_policy_id, asset_name: stable_assetname }

  let amount = 100_000_000
  let premium_bps = 500
  let threshold = 50

  let premium_payout = amount * premium_bps / 10_000

  let pool_datum =
    PoolDatum {
      pool_id,
      hedger,
      payment_asset,
      event_type,
      event_threshold: threshold,
      coverage_target: 0,
      premium_bps,
      subscription_start: 0,
      subscription_end: 5_000,
      event_time: 0,
      settlement_time: 2_000,
      fee_addr: mock_pub_key_address(2, None),
      pool_addr: script_address,
      fee_percentage: 5,
    }

  let contribution =
    ContributionData {
      data_list: [
        ContributionDatum {
          owner: subscriber,
          amount,
          amount_type: "SUBSCRIBER",
        },
      ],
    }

  let oracle_datum = create_oracle_datum(threshold * 2, 2_500, 5_000)

  let tx =
    mocktail_tx()
      |> tx_out(
          True,
          hedger,
          from_asset(payment_asset.asset_id, payment_asset.asset_name, amount),
        )
      |> tx_out(
          True,
          subscriber,
          from_asset(
            payment_asset.asset_id,
            payment_asset.asset_name,
            premium_payout,
          ),
        )
      |> invalid_before(True, 2001)
      |> invalid_hereafter(True, 4000)
      |> complete()
      |> add_input(
          True,
          Input {
            output_reference: mock_utxo_ref(0, 0),
            output: Output {
              address: script_address,
              value: from_asset(
                payment_asset.asset_id,
                payment_asset.asset_name,
                amount,
              ),
              datum: InlineDatum(contribution),
              reference_script: None,
            },
          },
        )
      |> add_input(
          True,
          Input {
            output_reference: mock_utxo_ref(0, 1),
            output: Output {
              address: script_address,
              value: from_asset(
                payment_asset.asset_id,
                payment_asset.asset_name,
                premium_payout,
              ),
              datum: InlineDatum(
                ContributionDatum {
                  owner: hedger,
                  amount: premium_payout,
                  amount_type: "PREMIUM",
                },
              ),
              reference_script: None,
            },
          },
        )
      |> add_reference_input(
          True,
          Input {
            output_reference: mock_utxo_ref(1, 0),
            output: Output {
              address: script_address,
              value: from_asset(reg_policy_id, pool_id, 1),
              datum: InlineDatum(pool_datum),
              reference_script: None,
            },
          },
        )
      |> add_reference_input(
          True,
          Input {
            output_reference: mock_utxo_ref(2, 0),
            output: Output {
              address: oracle_address,
              value: from_asset(oracle_policy_id, "oracle", 1),
              datum: InlineDatum(oracle_datum),
              reference_script: None,
            },
          },
        )

  parametrix.parametrix.spend(
    reg_policy_id,
    oracle_policy_id,
    hedger,
    pool_id,
    None,
    SettlePool,
    mock_utxo_ref(0, 0),
    tx,
  )
}

test settle_success_no_event_correct_split() {
  let hedger = mock_pub_key_address(9, None)
  let subscriber = mock_pub_key_address(0, None)

  let oracle_address = mock_script_address(2, None)

  let payment_asset =
    AssetClass { asset_id: stable_policy_id, asset_name: stable_assetname }

  let amount = 100_000_000
  let premium_bps = 500
  let threshold = 50

  let premium = amount * premium_bps / 10_000
  let total_payout = amount + premium

  let pool_datum =
    PoolDatum {
      pool_id,
      hedger,
      payment_asset,
      event_type,
      event_threshold: threshold,
      coverage_target: 0,
      premium_bps,
      subscription_start: 0,
      subscription_end: 5_000,
      event_time: 0,
      settlement_time: 2_000,
      fee_addr: mock_pub_key_address(2, None),
      pool_addr: script_address,
      fee_percentage: 5,
    }

  let contribution =
    ContributionData {
      data_list: [
        ContributionDatum {
          owner: subscriber,
          amount,
          amount_type: "SUBSCRIBER",
        },
      ],
    }

  // 👇 BELOW threshold → NO EVENT
  let oracle_datum = create_oracle_datum(threshold / 2, 2_500, 5_000)

  let tx =
    mocktail_tx()
      // Subscriber gets principal + premium
      |> tx_out(
          True,
          subscriber,
          from_asset(
            payment_asset.asset_id,
            payment_asset.asset_name,
            total_payout,
          ),
        )
      |> invalid_before(True, 2001)
      |> invalid_hereafter(True, 4000)
      |> complete()
      |> add_input(
          True,
          Input {
            output_reference: mock_utxo_ref(0, 0),
            output: Output {
              address: script_address,
              value: from_asset(
                payment_asset.asset_id,
                payment_asset.asset_name,
                amount,
              ),
              datum: InlineDatum(contribution),
              reference_script: None,
            },
          },
        )
      |> add_input(
          True,
          Input {
            output_reference: mock_utxo_ref(0, 1),
            output: Output {
              address: script_address,
              value: from_asset(
                payment_asset.asset_id,
                payment_asset.asset_name,
                premium,
              ),
              datum: InlineDatum(
                ContributionDatum {
                  owner: hedger,
                  amount: premium,
                  amount_type: "PREMIUM",
                },
              ),
              reference_script: None,
            },
          },
        )
      |> add_reference_input(
          True,
          Input {
            output_reference: mock_utxo_ref(1, 0),
            output: Output {
              address: script_address,
              value: from_asset(reg_policy_id, pool_id, 1),
              datum: InlineDatum(pool_datum),
              reference_script: None,
            },
          },
        )
      |> add_reference_input(
          True,
          Input {
            output_reference: mock_utxo_ref(2, 0),
            output: Output {
              address: oracle_address,
              value: from_asset(oracle_policy_id, "oracle", 1),
              datum: InlineDatum(oracle_datum),
              reference_script: None,
            },
          },
        )

  parametrix.parametrix.spend(
    reg_policy_id,
    oracle_policy_id,
    hedger,
    pool_id,
    None,
    SettlePool,
    mock_utxo_ref(0, 0),
    tx,
  )
}

test settle_fail_oracle_expired() {
  let hedger = mock_pub_key_address(9, None)
  let subscriber = mock_pub_key_address(0, None)

  let oracle_address = mock_script_address(2, None)

  let payment_asset =
    AssetClass { asset_id: stable_policy_id, asset_name: stable_assetname }

  let amount = 100_000_000
  let premium_bps = 500
  let threshold = 100

  let premium = amount * premium_bps / 10_000

  let pool_datum =
    PoolDatum {
      pool_id,
      hedger,
      payment_asset,
      event_type,
      event_threshold: threshold,
      coverage_target: 0,
      premium_bps,
      subscription_start: 0,
      subscription_end: 5_000,
      event_time: 0,
      settlement_time: 2_000,
      fee_addr: mock_pub_key_address(2, None),
      pool_addr: script_address,
      fee_percentage: 5,
    }

  let contribution =
    ContributionData {
      data_list: [
        ContributionDatum {
          owner: subscriber,
          amount,
          amount_type: "SUBSCRIBER",
        },
      ],
    }

  // 👇 expired oracle BUT event WOULD occur
  let oracle_datum =
    create_oracle_datum(
      threshold * 2,
      // event path
      1_000,
      1_500,
    )

  // expired (< settlement_time)
  let tx =
    mocktail_tx()
      // ✅ correct event payouts
      |> tx_out(
          True,
          hedger,
          from_asset(payment_asset.asset_id, payment_asset.asset_name, amount),
        )
      |> tx_out(
          True,
          subscriber,
          from_asset(payment_asset.asset_id, payment_asset.asset_name, premium),
        )
      |> invalid_before(True, 2001)
      |> invalid_hereafter(True, 4000)
      |> complete()
      |> add_input(
          True,
          Input {
            output_reference: mock_utxo_ref(0, 0),
            output: Output {
              address: script_address,
              value: from_asset(
                payment_asset.asset_id,
                payment_asset.asset_name,
                amount,
              ),
              datum: InlineDatum(contribution),
              reference_script: None,
            },
          },
        )
      |> add_input(
          True,
          Input {
            output_reference: mock_utxo_ref(0, 1),
            output: Output {
              address: script_address,
              value: from_asset(
                payment_asset.asset_id,
                payment_asset.asset_name,
                premium,
              ),
              datum: InlineDatum(
                ContributionDatum {
                  owner: hedger,
                  amount: premium,
                  amount_type: "PREMIUM",
                },
              ),
              reference_script: None,
            },
          },
        )
      |> add_reference_input(
          True,
          Input {
            output_reference: mock_utxo_ref(1, 0),
            output: Output {
              address: script_address,
              value: from_asset(reg_policy_id, pool_id, 1),
              datum: InlineDatum(pool_datum),
              reference_script: None,
            },
          },
        )
      |> add_reference_input(
          True,
          Input {
            output_reference: mock_utxo_ref(2, 0),
            output: Output {
              address: oracle_address,
              value: from_asset(oracle_policy_id, "oracle", 1),
              datum: InlineDatum(oracle_datum),
              reference_script: None,
            },
          },
        )

  !parametrix.parametrix.spend(
    reg_policy_id,
    oracle_policy_id,
    hedger,
    pool_id,
    None,
    SettlePool,
    mock_utxo_ref(0, 0),
    tx,
  )
}
