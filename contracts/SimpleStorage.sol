pragma solidity ^0.4.19;

contract SimpleStorage {

    string[] public photoArr;  //定义一个 装图片hash值的字符串数组

    function storePhoto(string hash) public {  //定义添加新图片hash方法
        photoArr.push(hash);   //往字符串数组末尾 添加 新图片的 hash
    }

    function getPhoto(uint index) public view returns (uint, string){  //定义函数:传入图片序列号,获取图片hash数组长度 和 对应序列号的 装图片hash值的字符串数组
        return (photoArr.length, photoArr[index]);
    }
    
}
