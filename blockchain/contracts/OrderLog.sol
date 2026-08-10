// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title OrderLog
/// @notice Records only confirmed orders — a single append-only entry
/// per order once it has passed verification, stock check, and payment.
/// Failed/rejected attempts never touch the chain, so gas is only
/// spent on orders that actually happened.
contract OrderLog {
    struct ConfirmedOrder {
        address company;
        address farmer;
        string cropName;
        uint256 quantity;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(string => ConfirmedOrder) private confirmedOrders;

    event OrderConfirmed(
        string indexed orderId,
        address indexed company,
        address indexed farmer,
        string cropName,
        uint256 quantity,
        uint256 amount,
        uint256 timestamp
    );

    function logConfirmedOrder(
        string calldata orderId,
        address company,
        address farmer,
        string calldata cropName,
        uint256 quantity,
        uint256 amount
    ) external {
        require(confirmedOrders[orderId].timestamp == 0, "Order already logged");

        confirmedOrders[orderId] = ConfirmedOrder(
            company, farmer, cropName, quantity, amount, block.timestamp
        );

        emit OrderConfirmed(orderId, company, farmer, cropName, quantity, amount, block.timestamp);
    }

    function getConfirmedOrder(string calldata orderId) external view returns (ConfirmedOrder memory) {
        return confirmedOrders[orderId];
    }
}