import { useState } from "react";
import { ethers } from "ethers";
// const { create } = require('ipfs-http-client');
// const ipfsClient = require('ipfs-http-client');
import { create as ipfsHttpClient } from 'ipfs-http-client';
import { useRouter } from "next/router";
import Web3Modal from 'web3modal';

const projectId = '2KuvAYJu0kvpHCT4uV9xdtnuDaw';
const projectSecret = 'eeab44c90ec60e9d02f9b9d7434a973b';

const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
const client = ipfsHttpClient({
  host: 'ipfs.infura.io',
  port: '5001',
  protocol: 'https',
  headers: {
    authorization: auth
  }
});

import { nftaddress, nftmarketaddress } from '../config.js';
import NFT from "../artifacts/contracts/NFT.sol/NFT.json";
import NFTMarket from "../artifacts/contracts/NFTMarket.sol/NFTMarket.json";

const CreateItem = () => {
  const [ fileUrl, setFileUrl ] = useState(null);
  const [formInput, updateFormInput] = useState({price: '', name: '', description: ''});
  
  const router = useRouter();

  const onChange = async(e) => {
    const file = e.target.files[0];
    try{
      const added = await client.add(
        file,
        {
          progress: (prog) => console.log(`received: ${prog}`)
        }
      )
      const url = `https://ipfs.infura.io:5001/${added.path}`;
      setFileUrl(url);
    }catch(error){
      console.log("Error uploading file, please try again: ", error);
    }
  }

  const createSale = async(url) => {
    const web3modal = new Web3Modal();
    const connection = await web3modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    const contract = new ethers.Contract(
      nftaddress,
      NFT.abi,
      signer
    );

    let transaction = await contract.createToken(url);
    let tx = await transaction.wait();
    let event = tx.events[0];
    let value = event.args[2];
    let tokenId = value.toNumber();

    const price = ethers.utils.parseUnits(formInput.price, 'ether');

    let contract2 = new ethers.Contract(
      nftmarketaddress,
      NFTMarket.abi,
      signer
    );

    let listingPrice = await contract2.getListingPrice();
    listingPrice = listingPrice.toString();

    transaction = await contract2.createMarketItem(nftaddress,tokenId,price,{value: listingPrice});
    await transaction.wait();
    router.push('/');

  }

  const createItem = async() => {
    const {name, description, price} = formInput;
    if(!name || !description || !price || !fileUrl) return;

    const data = JSON.stringify({
      name,
      description,
      image: fileUrl
    });


    try{
      const added = await client.add(data);
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      createSale(url);
    }catch(error){
      console.error(error);
    }

  }

  return(
    <div className='flex justify-center'>
      <div className='w-1/2 flex flex-col pb-12'>
        <input 
          placeholder = 'NFT name' 
          className = 'mt-8 border rounded p-4'
          onChange = {e => updateFormInput({
            ...formInput, 
            name: e.target.value
          })}
        />
        <textarea 
          placeholder = 'NFT Description'
          className = 'mt-2 border rounded p-4'
          onChange = {e => updateFormInput({
            ...formInput,
            description: e.target.value
          })}
        />
        <input 
          placeholder = 'NFT price in ETH'
          className = 'mt-2 border rounded p-4'
          onChange = {e => updateFormInput({
            ...formInput,
            price: e.target.value
          })}
        />
        <input 
          type='file'
          name='asset'
          className = 'my-3'
          onChange={onChange}

          />
          {
            fileUrl && (
              <img className='rounded mt-4' width='350' src={fileUrl} />
            )
          }
          <button
            onClick={createItem} className='font-bold mt-4 bg-gradient-to-r from-green-400 to-blue-500 hover:from-pink-500 hover:to-yellow-500text-white rounded p-4 shadow-lg'>
              Create NFT
          </button>
      </div>

    </div>
  );



}

export default CreateItem;