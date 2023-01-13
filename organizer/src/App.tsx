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


import { tab } from '@testing-library/user-event/dist/tab';
import React, { useState } from 'react';
import './App.css';


type GroupData = {
	title: string;
	group: chrome.tabGroups.TabGroup;
	tabs: chrome.tabs.Tab[];
}

type BookmarkData = {
	title: string;
	id: string;
	children: chrome.bookmarks.BookmarkTreeNode[];
}


class App extends React.Component<any, any> {

	constructor(props: any) {
		super(props)

		console.log("-- START --")

		this.state = {
			groups: [],
			bookmarks: []
		}

		this.update()
	}


	update() {

		// Groups
		chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT }, (groups) => {
			const groupsIDs = new Map()
			groups.forEach(group => {
				groupsIDs.set(group.id, group)
			})

			chrome.tabs.query({ currentWindow: true, pinned: false }, (tabs) => {
				var all: GroupData[] = []
				tabs.forEach(tab => {
					if (tab.groupId != chrome.tabGroups.TAB_GROUP_ID_NONE) {
						var useGroup = all.find(group => { return group.group.id == tab.groupId })
						if (useGroup != undefined) {
							useGroup.tabs.push(tab)
						} else {
							var data: GroupData = {
								title: groupsIDs.get(tab.groupId).title,
								group: groupsIDs.get(tab.groupId),
								tabs: [tab]
							}
							all.push(data)
						}
					}
				})
	
				this.setState({
					groups: all
				})
			});
		});



		// Bookmarks
		chrome.bookmarks.search({'title': '_organizer_'}, (nodes) => {
			if (nodes.length > 0) {
				chrome.bookmarks.getSubTree(nodes[0].id, (children) => {

					const nodes = children[0].children ?? []
					this.setState({
						bookmarks: nodes.map(node => {
							return {
								title: node.title,
								id: node.id,
								children: node.children ?? []
							} as BookmarkData
						})
					})		
				})
			}
		})
	}


	getRootBookmark(callback: (rootId: string) => void) {
		chrome.bookmarks.search({'title': '_organizer_'}, (nodes) => {
			if (nodes.length > 0) {
				callback(nodes[0].id)
			} else {
				chrome.bookmarks.create({'title': '_organizer_'}, (newFolder) => {
					callback(newFolder.id)
				})
			}
		})
	}

	
	getGroupBookmark(group: GroupData, rootId: string, callback: (folderId: string) => void) {
		const title = group.title + '~~' + group.group.color
		chrome.bookmarks.search({'title': title}, (nodes) => {
			if (nodes.length > 0) {
				nodes.forEach(node => {
					if (node.parentId == rootId) {
						callback(node.id)
						return
					}
				})
			} else {
				chrome.bookmarks.create({'title': title, "parentId": rootId}, (newFolder) => {
					callback(newFolder.id)
				})
			}
		})
	}


	saveGroup(group: GroupData) {
		this.getRootBookmark((rootId: string) => {
			this.getGroupBookmark(group, rootId, (folderId: string) => {
				group.tabs.forEach((tab, i: number) => {
					chrome.bookmarks.create({'title': tab.title ?? " ", 'url': tab.url ?? "", 'index': i, "parentId": folderId})
					chrome.tabs.remove(tab.id ?? -1)
				})

				// Update
				setTimeout(() => {
					this.update()
				}, 300)
			})
		})
	}


	async loadGroup(bookmark: BookmarkData) {

		// Validate
		if (bookmark.children.length <= 0) {
			console.log("loadGroup: No bookmaks to load")
			return
		}

		// Create Tabs
		const tabIds = await Promise.all(bookmark.children.map(async node => {
			const tab = await chrome.tabs.create({'url': node.url, active: false})
			return tab.id ?? 0
		}))

		// Create Group		
		var array = bookmark.title.split("~~")
		const color = (array.pop() ?? "grey") as chrome.tabGroups.ColorEnum
		const title = array.join('')
		const group = await chrome.tabs.group({ tabIds })
		await chrome.tabGroups.update(group, { title: title, color: color, collapsed: true })

		// Move to left
		const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false })
		const index = tabs.length > 0 ? tabs[0].index : 0
		await chrome.tabGroups.move(group, {index: index})

		// Delete bookmark
		chrome.bookmarks.removeTree(bookmark.id)

		this.update()
	}


	render() {

		// Active
		const activeTitles = this.state.groups.map((group: GroupData, i: number) => { 
			return <button key={i} className={"groups-button group-" + group.group.color} onClick={() => this.saveGroup(group)}>{group.title}</button> 
		})

		// Archived
		const archivedTitles = this.state.bookmarks.map((bookmark: BookmarkData, i: number) => {
			var array = bookmark.title.split("~~")
			const color = array.pop() ?? "grey"
			const title = array.join('')
			return <button key={i} className={"groups-button group-" + color} onClick={() => this.loadGroup(bookmark)}>{title}</button> 
		})

		return (
			<div className="App">
				{activeTitles.length > 0 ? "Active" : ""}
				<div className="groups-container" style={{marginBottom: '10px'}}>
					{activeTitles}
				</div>
				{archivedTitles.length > 0 ? "Archived" : ""}				
				<div className="groups-container">
					{archivedTitles}
				</div>
				{this.state.tabs}
			</div>
		)
	}
}

export default App;