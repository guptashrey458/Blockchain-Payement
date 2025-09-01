
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYieldAdapter {
    function deposit(address token, uint256 amount) external payable;
    function withdraw(address token, uint256 amount, address to) external;
    function balanceOf(address token) external view returns (uint256);
}
