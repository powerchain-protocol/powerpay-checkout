#![forbid(unsafe_code)]

pub const BASIS_POINTS_DENOMINATOR: u64 = 10_000;
pub const POWERPAY_SERVICE_FEE_BPS: u16 = 200;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SettlementMathError {
    Overflow,
    InvalidBasisPoints,
}

pub fn basis_points_amount_ceil(amount: u64, basis_points: u16) -> Result<u64, SettlementMathError> {
    if basis_points as u64 > BASIS_POINTS_DENOMINATOR {
        return Err(SettlementMathError::InvalidBasisPoints);
    }
    let numerator = (amount as u128)
        .checked_mul(basis_points as u128)
        .ok_or(SettlementMathError::Overflow)?;
    let denominator = BASIS_POINTS_DENOMINATOR as u128;
    let value = numerator
        .checked_add(denominator - 1)
        .ok_or(SettlementMathError::Overflow)?
        / denominator;
    u64::try_from(value).map_err(|_| SettlementMathError::Overflow)
}

pub fn powerpay_service_fee_lamports(amount_lamports: u64) -> Result<u64, SettlementMathError> {
    basis_points_amount_ceil(amount_lamports, POWERPAY_SERVICE_FEE_BPS)
}

pub fn total_before_network_fee_lamports(amount_lamports: u64) -> Result<u64, SettlementMathError> {
    amount_lamports
        .checked_add(powerpay_service_fee_lamports(amount_lamports)?)
        .ok_or(SettlementMathError::Overflow)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn service_fee_is_two_percent_and_rounds_up() {
        assert_eq!(powerpay_service_fee_lamports(1_000_000_000).unwrap(), 20_000_000);
        assert_eq!(powerpay_service_fee_lamports(1).unwrap(), 1);
    }
}
