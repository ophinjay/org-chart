# OrgChart.js

Orgchart.js is a JavaScript library for generating organization charts in HTML Pages. Supported features include
	
* Generation of chart from JSON data
* Option to make nodes of the chart selectable
* Option to configure nodes as collapsible
* Option to highlight the subtree of a node
* Option to edit the tree by dragging nodes and dropping them under another node

## OrgChart object
Create an object of type `vg.vizualization.OrgChart`. The constructor expects a JSON object as its input with the mandatory property `container` which should hold a reference to the DOM element under which the chart is to be generated.

	var tree = new vg.visualization.OrgChart({
    	"container": document.getElementById("treeContainer");
	});

### Chart options
#### Highlight subtree