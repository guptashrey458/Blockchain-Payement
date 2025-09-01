// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IYieldAdapter} from "./IYieldAdapter.sol";

contract NoopYieldAdapter is IYieldAdapter {
    receive() external payable {}
    function deposit(address, uint256) external payable {}
    function withdraw(address, uint256 amount, address to) external {
        if (amount > address(this).balance) amount = address(this).balance;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "NOOP: withdraw failed");
    }
    function balanceOf(address) external view returns (uint256) {
        return address(this).balance;
    }
}
