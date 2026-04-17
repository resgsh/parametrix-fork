use aiken/collection/list
use aiken/crypto.{ScriptHash}
use aiken/primitive/bytearray
use aiken/primitive/int
use cardano/address.{Address, Script, VerificationKey}
use cardano/assets.{
  AssetName, PolicyId, Value, flatten, from_asset, merge, quantity_of, zero,
}
use cardano/transaction.{Input, Output}
use cocktail/vodka_value.{get_all_value_from, get_all_value_to, value_tokens}
use types.{AssetClass}

pub fn out_value(outputs: List<Output>) -> Value {
  list.foldr(
    outputs,
    zero,
    fn(output, acc_value) { merge(acc_value, output.value) },
  )
}

pub fn in_value(inputs: List<Input>) -> Value {
  list.foldr(
    inputs,
    zero,
    fn(input, acc_value) { merge(acc_value, input.output.value) },
  )
}

pub fn find_script_inputs(
  inputs: List<Input>,
  script_hash: ScriptHash,
) -> List<Input> {
  inputs
    |> list.filter(
        fn(input) {
          when input.output.address.payment_credential is {
            Script(addr_script_hash) -> script_hash == addr_script_hash
            VerificationKey(_) -> False
          }
        },
      )
}

pub fn find_script_input(
  inputs: List<Input>,
  script_hash: ScriptHash,
) -> Option<Input> {
  list.find(
    inputs,
    fn(input) {
      when input.output.address.payment_credential is {
        Script(addr_script_hash) -> addr_script_hash == script_hash
        VerificationKey(_) -> False
      }
    },
  )
}

pub fn in_value_by_asset(
  inputs: List<Input>,
  policy_id: PolicyId,
  asset_name: AssetName,
) -> Value {
  list.foldr(
    inputs,
    zero,
    fn(input, acc) {
      let matching =
        value_tokens(input.output.value)
          |> list.filter(fn(t) { t.1st == policy_id && t.2nd == asset_name })
          |> list.map(fn(t) { from_asset(t.1st, t.2nd, t.3rd) })

      list.foldr(matching, acc, fn(v, acc2) { merge(acc2, v) })
    },
  )
}

pub fn sort_ins(ins: List<Input>) -> List<Input> {
  list.sort(
    ins,
    fn(a, b) {
      let cmp_txid =
        bytearray.compare(
          a.output_reference.transaction_id,
          b.output_reference.transaction_id,
        )

      if cmp_txid != Equal {
        cmp_txid
      } else {
        int.compare(
          a.output_reference.output_index,
          b.output_reference.output_index,
        )
      }
    },
  )
}

pub fn quantity_difference_at(
  inputs: List<Input>,
  outputs: List<Output>,
  address: Address,
  payment_asset: AssetClass,
) -> Int {
  let qout =
    get_all_value_to(outputs, address)
      |> quantity_of(payment_asset.asset_id, payment_asset.asset_name)

  qout - (
    get_all_value_from(inputs, address)
      |> quantity_of(payment_asset.asset_id, payment_asset.asset_name)
  )
}

pub fn quantity_output_to(
  outputs: List<Output>,
  address: Address,
  payment_asset: AssetClass,
) -> Int {
  get_all_value_to(outputs, address)
    |> quantity_of(payment_asset.asset_id, payment_asset.asset_name)
}

pub fn quantity_input_from(
  inputs: List<Input>,
  address: Address,
  payment_asset: AssetClass,
) -> Int {
  get_all_value_from(inputs, address)
    |> quantity_of(payment_asset.asset_id, payment_asset.asset_name)
}

pub fn get_quantity_from(
  inputs: List<Input>,
  address: Address,
  payment_asset: AssetClass,
) -> Int {
  list.foldl(
    inputs,
    0,
    fn(input, acc_value) {
      if input.output.address == address {
        acc_value + (
          input.output.value
            |> quantity_of(payment_asset.asset_id, payment_asset.asset_name)
        )
      } else {
        acc_value
      }
    },
  )
}

pub fn get_quantity_to(
  outputs: List<Output>,
  address: Address,
  payment_asset: AssetClass,
) -> Int {
  list.foldl(
    outputs,
    0,
    fn(output, acc_value) {
      if output.address == address {
        acc_value + (
          output.value
            |> quantity_of(payment_asset.asset_id, payment_asset.asset_name)
        )
      } else {
        acc_value
      }
    },
  )
}

pub fn quantities_for_three(
  outputs: List<Output>,
  fee_addr: Address,
  v_hedger: Address,
  beacon_owner: Address,
  payment_asset: AssetClass,
) -> (Int, Int, Int) {
  list.foldl(
    outputs,
    (0, 0, 0),
    //-- tuple: (dao_q, hedger_q, owner_q)
    fn(output, acc) {
      let qty =
        output.value
          |> quantity_of(payment_asset.asset_id, payment_asset.asset_name)

      if output.address == fee_addr {
        (acc.1st + qty, acc.2nd, acc.3rd)
      } else if output.address == v_hedger {
        (acc.1st, acc.2nd + qty, acc.3rd)
      } else if output.address == beacon_owner {
        (acc.1st, acc.2nd, acc.3rd + qty)
      } else {
        acc
      }
    },
  )
}

pub fn only_minted_token_with_policy(
  mint: Value,
  policy: PolicyId,
  quantity: Int,
) {
  when flatten(mint) is {
    [(minted_policy, _, minted_quantity)] ->
      minted_policy == policy && minted_quantity == quantity
    _ -> False
  }
}
