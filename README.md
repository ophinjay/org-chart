# OrgChart.js

Orgchart.js is a JavaScript library for generating organization charts in HTML Pages. Supported features include
	
* Generation of chart from JSON data
* Option to make nodes of the chart selectable
* Option to configure nodes as collapsible
* Option to highlight the subtree of a node
* Option to edit the tree by dragging nodes and dropping them under another node

![](/examples/Chart.PNG)

## OrgChart object
Create an object of type `vg.vizualization.OrgChart`. The constructor expects a JSON object as its input with the mandatory property `container` which should hold a reference to the DOM element under which the chart is to be generated.

	var tree = new vg.visualization.OrgChart({
    	"container": document.getElementById("treeContainer")
	});

### Chart options
The behavior of the chart can be configured during creation by providing an additional `options` parameter during object creation.
 
    var tree = new vg.visualization.OrgChart({
    	"container": document.getElementById("treeContainer"),
    	"options": {
    	    "highlightSubtree": true,
    	    "allowCollapse": true,
    	    "selectable": true,
    	    "showHoverColors": true,
    	    "editable": true
    	}
	});

* `highlightSubtree` - If this option is enabled, when the mouse hovers over a node, its sub-tree will be highlighted
* `allowCollapse` - When enabled, it causes the sub-tree of a node to be hidden upon double click. The sub-tree reappears when the node is double clicked again.
* `selectable` - Enable this option, if it is required to be able to select a node. A node can be selected by clicking on it.
* `showHoverColors` - Whenever the mouse hovers over a node, the color of that node will change if this option is enabled.
* `editable` - If enabled, the user will be able to drag a node and drop it under another one i.e. the tree can be edited by enabling this option.

> If only a static chart is required with no interactions, the options object can be avoided completely.

## Setting data
Node data to be displayed by the chart can be input by invoking the `setData()` library method. The function expects a 2-D array with data in the following format

	[
		[<node name>, <parent node name>, <tooltip text>, <data object>],
		...
	]

* `<node name>` - Name of the node. The string passed here will be displayed as the name of the node in that chart.
<<<<<<< HEAD
* `<parent node name>` - Name of the parent node. The parent node should have a valid node definition in the array.
* `<tooltip text>` - Optional text to be displayed as tool tip on mouse hover over the node.
* `<data object>` - Optional data object to be related with a node. If events are registered on nodes, the data object will be passed along with other details in the event object.

> Every tree should have a one and only one root node. The configuration for the root node should be provided while setting the data. The library identifies a node as the root node if both `<node name>` and `<parent node name>` are the same.

Eg.

	tree.setData([
	    ["Root Node", "Root Node", "This is the root node"],	//Root node configuration
	    ["Level 1 Node 1", "Root Node"],
	    ["Level 1 Node 2", "Root Node"],
	    ["Level 2 Node 1", "Level 1 Node 1"],
	    ["Level 2 Node 2", "Level 1 Node 1"],
	    ["Level 2 Node 3", "Level 1 Node 1"],
	    ["Level 2 Node 4", "Level 1 Node 2"],
	    ["Level 3 Node 1", "Level 2 Node 4"],
	    ["Level 3 Node 2", "Level 2 Node 4", undefined, {
	    	"data": "Data for 3rd level node"
	    }]
	]);


## Drawing the chart
After the data has been set, the chart can be rendered by invoking the `draw()` method

	tree.draw();

## Events
Events can be registered on the tree with the `setEventListener()` library method.

	tree.setEventListener(<event name>, eventHandlerFunction);

Events supported by the library are listed below

* `node-select` event is triggered when the user selects a node by clicking it.
* `node-dbclick` event is triggered when the user double clicks on a node.
* `node-hover` event is triggered when the mouse hovers above a node.
* `node-collapse` event is triggered when a node is collapsed or a collapsed node is expanded. This event will be triggered only if the `allowCollapse` option is enabled.

All events will call the attached handler function with an event object with the following properties

* `htmlEventObject` - The actual event object thrown by the browser for that event. This will be an object of the native type `MouseEvent` for all cases. 
* `nodeObject` - An object representing the node on which the event has occurred. `nodeObject` has the following useful properties
	* `data` - If any data object was set for this node while setting the data, that object can be retrieved from this property.
	* `childNodes` - Array of `nodeObject` representing the child nodes of the current node.
	* `name` - Name of the node
	* `parentNode` - `nodeObject` representing the parent of the node
	* `tooltip` - Tool tip(if any) set for the node
	* `isLeafNode` - `true` if the node is a leaf node
	* `isRootNode` - `true` if the node is the root node
	* `nodeDepth` - Depth of the node in the tree
* `isCollapsed` - This property will be set only for the `node-collapse` event. It will hold the value `true` if the node is collapsed.

## Utility methods
*	`getData()` - To get the current data of the chart. If the chart has been edited, the data returned by this method could be different from the data that was initially set depending on the changes made in the view. If it is a non-editable chart, the data returned by this method will be same as the data that was initially set before drawing the chart. 
*	`setVisibility(isVisible)` - To hide the chart, pass isVisible as `false`
*	`setPosition(left, top)` - Set the position of the chart on the page.
*	`getSubTree(nodeObject, inputObj)` - This method can be used to create a new chart using a `nodeObject` from an existing chart as the root node. The `inputObj` should be similar the object passed to the `OrgChart` constructor with at least the `container` property configured. The node represented by the `nodeObject` and its child nodes will be retrieved and a new chart will be drawn under the container mentioned in the `inputObj`. This method returns an `OrgChart` object corresponding to the new tree that was generated. 