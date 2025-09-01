
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UsernameRegistry {
    address public immutable owner;
    mapping(bytes32 => address) public ownerOfName; // nameHash => owner
    mapping(address => bytes32) public primaryOf;   // user => nameHash

    event Registered(bytes32 indexed nameHash, string name, address indexed owner);
    event PrimarySet(address indexed user, bytes32 indexed nameHash);

    constructor(address _owner){ owner = _owner; }

    function register(string calldata name) external {
        bytes32 h = keccak256(bytes(_lower(name)));
        require(h != bytes32(0), "EMPTY");
        require(ownerOfName[h] == address(0), "TAKEN");
        ownerOfName[h] = msg.sender;
        emit Registered(h, name, msg.sender);
    }

    function setPrimary(string calldata name) external {
        bytes32 h = keccak256(bytes(_lower(name)));
        require(ownerOfName[h] == msg.sender, "NOT_OWNER");
        primaryOf[msg.sender] = h;
        emit PrimarySet(msg.sender, h);
    }

    function resolve(string calldata name) external view returns (address) {
        return ownerOfName[keccak256(bytes(_lower(name)))];
    }

    function _lower(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint i; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 65 && c <= 90) b[i] = bytes1(c + 32);
        }
        return string(b);
    }
}
