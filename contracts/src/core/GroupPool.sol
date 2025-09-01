// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TokenUtils} from "../libs/TokenUtils.sol";
import {ZeroAmount} from "../errors/Errors.sol";

contract GroupPool {
    using TokenUtils for address;

    struct Pool {
        address creator;
        address token;
        address recipient;
        uint256 target;
        uint256 total;
        uint64  deadline;
        bool    closed;
    }

    address public immutable owner;
    uint256 public nextPoolId;
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event PoolCreated(uint256 indexed id, address indexed creator, address token, address recipient, uint256 target, uint64 deadline, string metadata);
    event Contributed(uint256 indexed id, address indexed from, uint256 amount, uint256 newTotal);
    event Distributed(uint256 indexed id, address indexed recipient, uint256 amount);

    constructor(address _owner){ owner = _owner; nextPoolId = 1; }

    function createPool(address token, address recipient, uint256 target, uint64 deadline, string calldata metadata) external returns (uint256 id) {
        require(recipient != address(0), "BAD_RECIPIENT");
        if (target == 0) revert ZeroAmount();
        id = nextPoolId++;
        pools[id] = Pool(msg.sender, token, recipient, target, 0, deadline, false);
        emit PoolCreated(id, msg.sender, token, recipient, target, deadline, metadata);
    }

    function contribute(uint256 id, uint256 amount) external payable {
        Pool storage p = pools[id];
        require(p.creator != address(0), "NO_POOL");
        if (p.token == address(0)) {
            amount = msg.value;
            if (amount == 0) revert ZeroAmount();
        } else {
            p.token.pullIn(msg.sender, amount);
        }
        p.total += amount;
        contributions[id][msg.sender] += amount;
        emit Contributed(id, msg.sender, amount, p.total);

        if (!p.closed && p.total >= p.target) {
            p.closed = true;
            p.token.transferOut(p.recipient, p.total);
            emit Distributed(id, p.recipient, p.total);
        }
    }

    function cancel(uint256 id) external {
        Pool storage p = pools[id];
        require(p.creator == msg.sender, "ONLY_CREATOR");
        p.closed = true;
    }

    function refund(uint256 id) external {
        Pool storage p = pools[id];
        require(p.closed, "NOT_CLOSED");
        uint256 c = contributions[id][msg.sender];
        require(c > 0, "NO_CONTRIB");
        contributions[id][msg.sender] = 0;
        p.token.transferOut(msg.sender, c);
    }
}
