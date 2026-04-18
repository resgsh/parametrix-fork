use cardano/address.{Address}
use cardano/assets.{PolicyId}

// Hardcoded parameters
pub const deposit_amount_required: Int = 3_000_000

pub const micro_units: Int = 1_000_000

pub const backing_beacon_assetname = "backing_beacon"

pub const registry_token_name = "registry_token"

pub type AssetClass {
  asset_id: PolicyId,
  asset_name: ByteArray,
}

pub type PoolDatum {
  pool_id: ByteArray,
  payment_asset: AssetClass,
  hedger: Address,
  event_type: ByteArray,
  event_threshold: Int,
  coverage_target: Int,
  premium_bps: Int,
  // POSIX time in milliseconds, e.g. 1672843961000
  subscription_start: Int,
  subscription_end: Int,
  event_time: Int,
  settlement_time: Int,
  fee_addr: Address,
  fee_percentage: Int,
}

pub type ContributionDatum {
  owner: Address,
  amount: Int,
  amount_type: ByteArray,
}

//SUBSCRIPTION | PREMIUM

pub type ContributionData {
  data_list: List<ContributionDatum>,
}

pub type BackingBeaconDatum {
  beacon_owner: Address,
  prefix: ByteArray,
  ticket_number: Int,
  boost: Int,
  folded_ticket_count: Int,
}
