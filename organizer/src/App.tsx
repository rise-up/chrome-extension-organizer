/*
Copyright 2022 株式会社Rise UP (ライズアップ) https://r-up.jp

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/


import React, { useState } from 'react';
import './App.css';


class App extends React.Component<any, any> {

	constructor(props: any) {
		super(props)

		console.log("-- START --")


		this.state = {
			tabs: []
		}


		chrome.tabs.query({ currentWindow: true, pinned: false }, (tabs) => {
			// tabs.forEach(tab => {
			// 	console.log("TAB: " + tab.title)			
			// })
	
			const filtered = tabs.filter((tab) => { return tab.groupId != chrome.tabGroups.TAB_GROUP_ID_NONE })

			this.setState({
				tabs: filtered.map((tab, i) => { return <div key={i}>{tab.title}</div> })
			})
		});
	}


	render() {
		return (
			<div className="App">
				<header className="App-header">
					{this.state.tabs}
				</header>
			</div>
		)
	}
}

export default App;