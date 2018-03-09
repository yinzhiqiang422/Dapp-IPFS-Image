# Dapp-IPFS-Image
基于IPFS去中心化相册以太坊Dapp  

>注意: 使用该 github 克隆到本地, 需要 执行 `$ npm install` 安装依赖 node_modules

## 安装IPFS
官网(访问不了时,需要科学上网)  [https://ipfs.io](https://ipfs.io)   
下载
解压缩   
`$ tar xvfz go-ipfs_v0.4.10_darwin-amd64.tar.gz`  
`$ cd go-ipfs`  
`$ mv ipfs /usr/local/bin/ipfs`  
### 创建IPFS节点
`$ ipfs init`  
`$ cd ~/.ipfs`  
### 启动服务器
`ipfs daemon`  
### 跨域资源共享 CORS配置
`control + c` 终止ipfs服务器进程  

```
$ ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "GET", "POST", "OPTIONS"]'
$ ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
$ ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'
$ ipfs config --json API.HTTPHeaders.Access-Control-Allow-Headers '["Authorization"]'
$ ipfs config --json API.HTTPHeaders.Access-Control-Expose-Headers '["Location"]'
```

### 验证
启动IPFS服务器   
`$ ipfs daemon`  
**新建**终端执行:  
`$ ipfs cat /ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme`  
打开[http://localhost:5001/webui](http://localhost:5001/webui)会看到UI界面  

> 需要 truffle ,node.js ,npm ,react 环境安装 参考之前环境配置文章

## 项目开发
新建项目文件夹  
`$ mkdir 项目名IPFS-Image`  
`cd IPFS-Image`   

下载unbox react 框架  
`$ truffle unbox react`  
### 安装ipfs-api
`$ npm install ipfs-api --save-dev`  
### 验证框架和环境:
编译合约  
`$ truffle compile`  

开启前端  
`$ npm start`  

看见 项目页面, ok

### 修改项目框架代码:
Atom编辑器打开项目:  
`$ atom ./`  

### 编写智能合约
修改`contracts/SimpleStorage.sol`文件

```solidity
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
```

### 修改 src/app.js

```javascript
import React, {Component} from 'react'
import SimpleStorageContract from '../build/contracts/SimpleStorage.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

import ipfsAPI from 'ipfs-api'
const ipfs = ipfsAPI({host: 'localhost', port: '5001', protocal: 'http'})

const contractAddress = "0xd7d25cd0f1ab028a43576b93380c52992716a0d1"
let simpleStorageInstance

let saveImageOnIpfs = (reader) => {
	return new Promise(function (resolve, reject) {
		const buffer = Buffer.from(reader.result);
		ipfs.add(buffer).then((response) => {
			console.log(response)
			resolve(response[0].hash);
		})
		.catch((err) => {
			console.error(err)
			reject(err);
		})
	})
}

class App extends Component {
	constructor(props) {
		super(props)

		this.state = {
			photos: [],
			count: 0,
			web3: null
		}
  	}

  	componentWillMount() {
    // Get network provider and web3 instance. See utils/getWeb3 for more info.

    getWeb3.then(results => {
    	this.setState({web3: results.web3})
			this.instantiateContract()
		}).catch(() => {
			console.log('Error finding web3.')
		})
	}

  	instantiateContract() {
		const that = this
		const contract = require('truffle-contract')
		const simpleStorage = contract(SimpleStorageContract)
		simpleStorage.setProvider(this.state.web3.currentProvider)

    	this.state.web3.eth.getAccounts((error, accounts) => {
        	simpleStorage.at(contractAddress).then((instance) => {
				simpleStorageInstance = instance
			})
			.then(result => {
				return simpleStorageInstance.getPhoto(0)
			})
			.then(result => {
				console.log(result)
				let imgNum = result[0].c[0]
				if(imgNum===0){
					return
				}
				if(imgNum===1){
					this.setState({
						count: imgNum,
						photos: this.state.photos.concat([result[1]])
					})
				}
				if(imgNum>1){
					for(let i=0;i<imgNum;i++){
						(function(i){
							simpleStorageInstance.getPhoto(i)
							.then(result => {
								that.setState({
									photos: that.state.photos.concat([result[1]])
								})
							})
						})(i)
					}	
				}
			})
		})
	}

  	render() {
		let doms = [],
			photos = this.state.photos
		for(let i=0; i<photos.length;i++){
			doms.push(<div key={i}><img src={"http://localhost:8080/ipfs/" + photos[i]}/></div>)
		}
		
		return (
			<div className="App">
				<header>上传图片至ipfs，并保存信息至以太坊区块</header>
				<div className="upload-container">
					<label id="file">选择图片</label>
					<input type="file" ref="file" id="file" name="file" multiple="multiple" onChange={e => this.change(e)}/>
					<button onClick={() => this.upload()}>上传</button>
				</div>
				<div className="img-container">
					{doms}
				</div>
			</div>
		);
	}

 	upload() {
		var file = this.refs.file.files[0];
		console.log(file)
    	var reader = new FileReader();
		// reader.readAsDataURL(file);
		reader.readAsArrayBuffer(file)
		reader.onloadend = (e) => {
			//console.log(reader);
			saveImageOnIpfs(reader).then((hash) => {
				console.log(hash);
				this.setState({imgSrc: hash})
					simpleStorageInstance.storePhoto(hash, {from: this.state.web3.eth.accounts[0]})
					.then(() => {
						console.log("写入区块成功")
						this.setState({
							photos: this.state.photos.concat([hash])
						})
					})
			});
		}
	}
	change(e){
		console.log(e.target.value)
	}  
}

export default App
```
### 修改src/app.css 前端 UI CSS

```css
/* PAGE */
* {
    margin: 0;
    padding: 0;
}
html, body, #root, .App{
    width: 100%;
    height: 100%;
}
.App{
    display: flex;
    flex-direction: column;
}
header{
    height: 60px;
    line-height: 60px;
    padding: 0 20px;
    background: #cfd8dc;
    border-bottom: 1px solid #eee;
    font-size: 24px;
    color: #fff;
}
.upload-container {
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #cfd8dc;
    color: #666;
}
.img-container {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    /* align-items: center; */
    height: 80px;
    background: #eceff1;
}
.img-container div{
    width: 200px;
    height: 200px;
    margin: 20px;
    box-shadow: 0 0 10px #ccc;
    border-radius: 3px;
}
.img-container div{
    display: flex;
    justify-content: center;
    align-items: center;
}
.img-container div img{
    max-width: 200px;
    max-height: 200px;
}
.upload-container input{
    font-size: 14px;
    display: flex;
    align-items: center;
    margin-left: 10px;
}
.upload-container button{
    height: 30px;
    width: 80px;
    line-height: 30px;
    font-size: 14px;
    color: #fff;
    border: 0;
    outline: none;
    cursor: pointer;
    border-radius: 3px;
    background: cadetblue
}
.upload-container button:hover{
    opacity: 0.7;
}
```


### 本地测试:
> 编译部署合约


`$ truffle develop                 //启动truffle本地合约测试框架`

![](http://p37d7w3w4.bkt.clouddn.com/truffledevelop.png)
(Mnemonic:后面 就是本地 以太坊测试框架区块链 钱包的助记词,可用于直接导入 Metamask钱包中)  


`$ truffle(develop)> compile      //编译`  
`$ truffle(develop)> migrate     //部署合约`  
![](http://p37d7w3w4.bkt.clouddn.com/migrate.png)


>复制智能合约 SimpleStorage 的地址

- 修改 `src/app.js` 合约地址  
`const contractAddress = "0x345ca3e014aaf5dca488057592ee47305d9b3e10"  //SimpleStorage合约地址`  


![](http://p37d7w3w4.bkt.clouddn.com/%E6%94%B9%E5%90%88%E7%BA%A6.png)

- **新建**终端(truffle develop框架不要关), 启动IPFS服务器:  
`$ ipfs daemon`

- **新建**终端, 启动 前端:  
`$ npm start`  

![](http://p37d7w3w4.bkt.clouddn.com/npm%20start.png)


- 安装 `Metamask` 钱包(科学上网):  
[https://metamask.io](https://metamask.io)  

- 设置`RPC`  
添加`http://localhost:9545`

![](http://p37d7w3w4.bkt.clouddn.com/metamask1.png)
![](http://p37d7w3w4.bkt.clouddn.com/rpc.png)


- 调到` RPC localhost 9545 `网络
- 导入 truffl 框架 分配的私钥

- 选择图片文件上传. 提示消耗Gas 点击`SUBMIT`
![](http://p37d7w3w4.bkt.clouddn.com/metamash2.png)

如果消耗gas出错, 可以导入truffle 助记词到MetaMask钱包,重试.
>图片显示项目成功

![](http://p37d7w3w4.bkt.clouddn.com/ok1.png)
>可以多上传几张测试


![](http://p37d7w3w4.bkt.clouddn.com/ok2.png)

***************************


### Block DEV Blog 区块链开发博客: http://jiangfuyao.com  

>***日后随着 学习打怪的不断深入，会解锁其他的高级教程。***  


>### ***期待 吗？ 那就关注 blockdev 公众号 随时锁定区块链开发学习教程进度 ：)***
