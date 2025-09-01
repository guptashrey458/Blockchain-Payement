// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IYieldAdapter} from "../adapters/IYieldAdapter.sol";
import {TokenUtils} from "../libs/TokenUtils.sol";
import {ZeroAmount} from "../errors/Errors.sol";

contract SavingsPot {
    using TokenUtils for address;

    struct Pot {
        address owner;
        address token;
        uint256 target;
        uint256 balance;
        uint64  created;
        bool    closed;
    }

    address public immutable owner;
    IYieldAdapter public immutable adapter;
    uint256 public nextPotId;
    mapping(uint256 => Pot) public pots;

    event PotCreated(uint256 indexed id, address indexed owner, address token, uint256 target);
    event Deposited(uint256 indexed id, address indexed from, uint256 amount, uint256 newBalance);
    event Withdrawn(uint256 indexed id, address indexed to, uint256 amount, uint256 newBalance);
    event Closed(uint256 indexed id);

    constructor(address _owner, address _adapter){
        owner = _owner;
        adapter = IYieldAdapter(_adapter);
        nextPotId = 1;
    }

    function createPot(address token, uint256 target) external returns (uint256 id) {
        if (target == 0) revert ZeroAmount();
        id = nextPotId++;
        pots[id] = Pot(msg.sender, token, target, 0, uint64(block.timestamp), false);
        emit PotCreated(id, msg.sender, token, target);
    }

    function deposit(uint256 id, uint256 amount) external payable {
        Pot storage p = pots[id];
        require(p.owner != address(0), "NO_POT");
        if (p.token == address(0)) {
            amount = msg.value;
            if (amount == 0) revert ZeroAmount();
        } else {
            p.token.pullIn(msg.sender, amount);
        }
        p.balance += amount;
        emit Deposited(id, msg.sender, amount, p.balance);
    }

    function withdraw(uint256 id, uint256 amount, address to) external {
        Pot storage p = pots[id];
        require(msg.sender == p.owner, "ONLY_OWNER");
        require(amount > 0 && amount <= p.balance, "BAD_AMOUNT");
        p.balance -= amount;
        p.token.transferOut(to == address(0) ? msg.sender : to, amount);
        emit Withdrawn(id, to == address(0) ? msg.sender : to, amount, p.balance);
    }

    function close(uint256 id) external {
        Pot storage p = pots[id];
        require(msg.sender == p.owner, "ONLY_OWNER");
        require(!p.closed, "ALREADY");
        p.closed = true;
        if (p.balance > 0) {
            p.token.transferOut(msg.sender, p.balance);
            p.balance = 0;
        }
        emit Closed(id);
    }
}
