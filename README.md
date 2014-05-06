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

## Setting data
Node data to be displayed by the chart can be input by invoking the `setData()` library method. The function expects a 2-D array with data in the following format

	[
		[<node name>, <parent node name>, <tooltip text>, <data object>],
		...
	]

* `<node name>` - Name of the node. The string passed here will be displayed as the name of the node in that chart.
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