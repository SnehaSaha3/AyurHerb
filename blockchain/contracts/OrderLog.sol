// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title OrderLog
/// @notice Records confirmed orders, escrow funding, and tranche releases.
contract OrderLog {
    struct ConfirmedOrder {
        address company;
        address farmer;
        string cropName;
        uint256 quantity;
        uint256 amount;
        uint256 timestamp;
    }

    struct EscrowRecord {
        bytes32 dataHash;
        uint256 timestamp;
        bool funded;
    }

    struct TrancheRecord {
        string trancheType;
        uint256 percent;
        bytes32 dataHash;
        uint256 timestamp;
        bool released;
    }

    // ---------------------------------------------------------
    // Storage
    // ---------------------------------------------------------

    mapping(string => ConfirmedOrder) private confirmedOrders;

    mapping(string => EscrowRecord) private escrowRecords;

    mapping(string => TrancheRecord[]) private trancheRecords;

    // ---------------------------------------------------------
    // Events
    // ---------------------------------------------------------

    event OrderConfirmed(
        string indexed orderId,
        address indexed company,
        address indexed farmer,
        string cropName,
        uint256 quantity,
        uint256 amount,
        uint256 timestamp
    );

    event EscrowFunded(
        string indexed orderId,
        bytes32 dataHash,
        uint256 timestamp
    );

    event TrancheReleased(
        string indexed orderId,
        string trancheType,
        uint256 percent,
        bytes32 dataHash,
        uint256 timestamp
    );

    // ---------------------------------------------------------
    // Confirmed Order
    // ---------------------------------------------------------

    function logConfirmedOrder(
        string calldata orderId,
        address company,
        address farmer,
        string calldata cropName,
        uint256 quantity,
        uint256 amount
    ) external {
        require(
            confirmedOrders[orderId].timestamp == 0,
            "Order already logged"
        );

        confirmedOrders[orderId] = ConfirmedOrder({
            company: company,
            farmer: farmer,
            cropName: cropName,
            quantity: quantity,
            amount: amount,
            timestamp: block.timestamp
        });

        emit OrderConfirmed(
            orderId,
            company,
            farmer,
            cropName,
            quantity,
            amount,
            block.timestamp
        );
    }

    // ---------------------------------------------------------
    // Escrow Funded
    // ---------------------------------------------------------

    function logEscrowFunded(
        string calldata orderId,
        bytes32 dataHash
    ) external {
        require(
            confirmedOrders[orderId].timestamp != 0,
            "Order not confirmed"
        );

        require(
            !escrowRecords[orderId].funded,
            "Escrow already funded"
        );

        escrowRecords[orderId] = EscrowRecord({
            dataHash: dataHash,
            timestamp: block.timestamp,
            funded: true
        });

        emit EscrowFunded(
            orderId,
            dataHash,
            block.timestamp
        );
    }

    // ---------------------------------------------------------
    // Tranche Released
    // ---------------------------------------------------------

    function logTrancheReleased(
        string calldata orderId,
        string calldata trancheType,
        uint256 percent,
        bytes32 dataHash
    ) external {
        require(
            confirmedOrders[orderId].timestamp != 0,
            "Order not confirmed"
        );

        require(
            escrowRecords[orderId].funded,
            "Escrow not funded"
        );

        require(
            percent > 0 && percent <= 100,
            "Invalid percentage"
        );

        trancheRecords[orderId].push(
            TrancheRecord({
                trancheType: trancheType,
                percent: percent,
                dataHash: dataHash,
                timestamp: block.timestamp,
                released: true
            })
        );

        emit TrancheReleased(
            orderId,
            trancheType,
            percent,
            dataHash,
            block.timestamp
        );
    }

    // ---------------------------------------------------------
    // Get Confirmed Order
    // ---------------------------------------------------------

    function getConfirmedOrder(
        string calldata orderId
    ) external view returns (ConfirmedOrder memory) {
        return confirmedOrders[orderId];
    }

    // ---------------------------------------------------------
    // Get Escrow
    // ---------------------------------------------------------

    function getEscrow(
        string calldata orderId
    ) external view returns (EscrowRecord memory) {
        return escrowRecords[orderId];
    }

    // ---------------------------------------------------------
    // Get Tranches
    // ---------------------------------------------------------

    function getTranches(
        string calldata orderId
    ) external view returns (TrancheRecord[] memory) {
        return trancheRecords[orderId];
    }
}