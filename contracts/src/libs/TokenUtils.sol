
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library TokenUtils {
    address internal constant NATIVE = address(0);

    function transferOut(address token, address to, uint256 amount) internal {
        if (token == NATIVE) {
            (bool ok,) = to.call{value: amount}("");
            require(ok, "NATIVE_XFER_FAIL");
        } else {
            (bool ok, bytes memory data) =
                token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
            require(ok && (data.length == 0 || abi.decode(data, (bool))), "ERC20_XFER_FAIL");
        }
    }

    function pullIn(address token, address from, uint256 amount) internal {
        if (token == NATIVE) {
            require(msg.value == amount, "BAD_NATIVE_VALUE");
        } else {
            (bool ok, bytes memory data) =
                token.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, address(this), amount));
            require(ok && (data.length == 0 || abi.decode(data, (bool))), "ERC20_PULL_FAIL");
        }
    }
}
