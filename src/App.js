import React, {Component} from 'react'
import SimpleStorageContract from '../build/contracts/SimpleStorage.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

import ipfsAPI from 'ipfs-api'
const ipfs = ipfsAPI({host: 'localhost', port: '5001', protocal: 'http'})

const contractAddress = "0x345ca3e014aaf5dca488057592ee47305d9b3e10"  //合约地址
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
					<input type="file" ref="file" id="file" name="file" multiple="multip
					le" onChange={e => this.change(e)}/>
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
