// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {UsernameRegistry} from "./UsernameRegistry.sol";
import {TokenUtils} from "../libs/TokenUtils.sol";
import {ZeroAmount, AlreadyClaimed, NotExpired, NoSuchItem} from "../errors/Errors.sol";

contract ProtectedEscrow {
    using TokenUtils for address;

    enum RecipientType { Address, Username }

    struct Transfer {
        address sender;
        address token;
        uint256 amount;
        uint64  expiry;       // 0 = no expiry
        bytes32 recipient;    // if Address: left-padded address; if Username: nameHash
        RecipientType rtype;
        bytes32 hashlock;     // 0x0 if none
        bool    claimed;
    }

    address public immutable owner;
    UsernameRegistry public immutable registry;
    uint256 public nextId;

    event TransferCreated(
        uint256 indexed id,
        address indexed sender,
        address token,
        uint256 amount,
        RecipientType rtype,
        bytes32 recipient,
        uint64 expiry,
        bytes32 hashlock,
        string note
    );
    event Claimed(uint256 indexed id, address indexed to);
    event Refunded(uint256 indexed id, address indexed to);

    mapping(uint256 => Transfer) public transfers;

    constructor(address _owner, UsernameRegistry _reg){
        owner  = _owner;
        registry = _reg;
        nextId = 1;
    }

    function createTransfer(
        address token,
        uint256 amount,
        uint8 rtype,
        bytes32 recipient,
        uint64 expiry,
        bytes32 hashlock,
        string calldata note
    ) external payable returns (uint256 id){
        if (amount == 0) revert ZeroAmount();
        if (token == address(0)) {
            require(msg.value == amount, "BAD_VALUE");
        } else {
            token.pullIn(msg.sender, amount);
        }

        id = nextId++;
        transfers[id] = Transfer({
            sender: msg.sender,
            token: token,
            amount: amount,
            expiry: expiry,
            recipient: recipient,
            rtype: RecipientType(rtype),
            hashlock: hashlock,
            claimed: false
        });

        emit TransferCreated(id, msg.sender, token, amount, RecipientType(rtype), recipient, expiry, hashlock, note);
    }

    function claim(uint256 id) external {
        Transfer storage t = transfers[id];
        if (t.sender == address(0)) revert NoSuchItem();
        if (t.claimed) revert AlreadyClaimed();
        if (t.expiry != 0 && block.timestamp < t.expiry) revert NotExpired();

        address to;
        if (t.rtype == RecipientType.Address) {
            // right 20 bytes
            to = address(uint160(uint256(t.recipient)));
        } else {
            to = registry.ownerOfName(t.recipient); // internal accessor via mapping; expose helper below
            require(to != address(0), "NO_USER");
        }

        t.claimed = true;
        t.token.transferOut(to, t.amount);
        emit Claimed(id, to);
    }

    function claimBySecret(uint256 id, bytes calldata preimage, address to) external {
        Transfer storage t = transfers[id];
        if (t.sender == address(0)) revert NoSuchItem();
        if (t.claimed) revert AlreadyClaimed();
        require(t.hashlock != bytes32(0) && keccak256(preimage) == t.hashlock, "BAD_SECRET");
        t.claimed = true;
        address recipient = (to == address(0)) ? msg.sender : to;
        t.token.transferOut(recipient, t.amount);
        emit Claimed(id, recipient);
    }

    function refund(uint256 id) external {
        Transfer storage t = transfers[id];
        if (t.sender == address(0)) revert NoSuchItem();
        require(msg.sender == t.sender, "ONLY_SENDER");
        require(!t.claimed, "ALREADY");
        // allow refund any time if desired; or enforce expiry
        t.claimed = true;
        t.token.transferOut(t.sender, t.amount);
        emit Refunded(id, t.sender);
    }

    // view helper
    function ownerOfName(bytes32 nameHash) external view returns (address) {
        // helper for UI, mirrors registry mapping
        return registry.ownerOfName(nameHash);
    }

    receive() external payable {}
}
