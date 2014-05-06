if (!window["vg"]) {
    window["vg"] = {};
}

if (!vg.visualization) {
    vg.visualization = {};
}

if (!vg.utilities) {
    vg.utilities = {};
}

//Events class
vg.utilities.Events = function(eventTypesArr) {
    this.eventTypes = {};
    this.events = {};
    for (var i = 0; i < eventTypesArr.length; i++) {
        this.eventTypes[eventTypesArr[i]] = true;
    }
};

//Static functions
vg.utilities.Events.bindHandler = function(functionObj, thisObj, args) {
    args = args || [];
    return function(eventObject) {
        eventObject = eventObject || window.event;
        args.unshift(eventObject);
        functionObj.apply(thisObj, args);
    };
};

//Public functions
vg.utilities.Events.prototype = (function() {
    var setEventListener = function(eventType, handler) {
        if (this.eventTypes[eventType]) {
            this.events[eventType] = handler;
            return true;
        }
        return false;
    };

    var triggerEvent = function(eventType, eventObject) {
        if (this.eventTypes[eventType] && this.events[eventType]) {
            this.events[eventType](eventObject);
            return true;
        }
        return false;
    };

    return {
        "setEventListener": setEventListener,
        "triggerEvent": triggerEvent
    };
})();

vg.visualization.OrgChart = (function() {
    var nodePositions = {
        "LEFTMOST": "0",
        "BETWEEN": "1",
        "RIGHTMOST": "2",
        "ONENODE": "3"
    };

    var positionClasses = [
        ["", "top left"],
        ["top", "top left"],
        ["top", "left"],
        ["", "left"]
    ];

    var classes = {
        "node": "node",
        "childStub": "left",
        "chart": "vg-orgchart",
        "node-select": "selected",
        "node-hover": "hover",
        "visiblity": "hidden",
        "collapse": "collapsed",
        "clicked": "clicked",
        "dragged": "dragged"
    };

    var createNode = function(nodeType, inputObj) {
        var element = document.createElement(nodeType);
        if (inputObj) {
            inputObj["className"] && inputObj["className"].length > 0 && (element.className = inputObj["className"]);
            if (inputObj["attributes"]) {
                for (var i in inputObj["attributes"]) {
                    element.setAttribute(i, inputObj["attributes"][i]);
                }
            }
            inputObj["parent"] && inputObj["parent"].appendChild(element);
            inputObj["innerHTML"] && (element.innerHTML = inputObj["innerHTML"]);
            if (inputObj["eventHandlers"]) {
                if (element.addEventListener) {
                    var addFunction = "addEventListener";
                    var handlerPrefix = "";
                } else {
                    addFunction = "attachEvent";
                    handlerPrefix = "on";
                }
                for (i in inputObj["eventHandlers"]) {
                    element[addFunction](handlerPrefix + i, inputObj["eventHandlers"][i]);
                }
            }
        }
        return element;
    };

    //Inner node class
    var Node = function(inputObj) {
        if (inputObj.name === "" || !inputObj.name) {
            throw "Node name not provided for the node";
        }
        this.name = inputObj["name"];
        this.tooltip = inputObj["tooltip"] || "";
        this.data = inputObj["data"] || undefined;
        this.userData = inputObj["userData"];
        this.nodePosition = inputObj["nodePosition"];
        this.setParentNode(inputObj["parentNode"]);
        this.constructor = arguments.callee;
        //node-click, node-dbclick, node-hover
        this.events = {};
        this.orgChart = inputObj["orgChart"];
        this.nodeIndex = inputObj["nodeIndex"];
        this.isCollapsed = false;
        this.isHidden = false;
        this.isClicked = false;
    };

    Node.prototype = new vg.utilities.Events(["node-click", "node-dbclick", "node-hover"]);

    (function(prototypeObject) {
        var setParentNode = function(parentNodeObj) {
            this.parentNode = parentNodeObj;
            this.isRootNode = !parentNodeObj;
            this.nodeDepth = parentNodeObj ? (parentNodeObj.nodeDepth + 1) : 0;
        };

        var setChildNodes = function(childNodes, leafNodeCount) {
            if (childNodes.length === 0) {
                this.isLeafNode = true;
                this.childNodes = undefined;
            } else {
                this.isLeafNode = false;
                this.childNodes = childNodes;
            }
        };

        var setDimensions = function(leafNodeCount, index, depthMap) {
            this.leafNodeCount = !this.childNodes ? 1 : leafNodeCount;
            var targetSize = this.leafNodeCount * 8;
            this.dimensionMatrix = getDimensionMatrix(targetSize);
            this.depthMap = depthMap;
            setLeafNodeIndices(this, index);
            leftSideCorrection(this, depthMap[depthMap.length - 1]);
            !this.isLeafNode && centralizeNode(this);
        };

        var setLeafNodeIndices = function(nodeObj, index) {
            if (nodeObj.isLeafNode) {
                nodeObj.startLeafIndex = index;
                nodeObj.endLeafIndex = index;
            } else {
                nodeObj.startLeafIndex = nodeObj.childNodes[0].startLeafIndex;
                nodeObj.endLeafIndex = nodeObj.childNodes.slice(-1)[0].endLeafIndex;
            }
        };

        var leftSideCorrection = function(currentNode, previousNode) {
            var toAdd = (currentNode.startLeafIndex - (previousNode ? previousNode.endLeafIndex : 0) - 1) * 8;
            toAdd > 0 && currentNode.dimensionMatrix.forEach(function(elmt, i, arr) {
                elmt[0] = elmt[0] + toAdd;
            });
        };

        var getNodeWidth = function() {
            return this.dimensionMatrix[1].reduce(function(a, b) {
                return a + b;
            });
        };

        var centralizeNode = function(nodeObj) {
            var firstChild = nodeObj.childNodes[0];
            var lastChild = nodeObj.childNodes.slice(-1)[0];
            if (nodeObj.name == "b") {
                debugger;
            }
            var distObj = getDistanceBetween(firstChild, lastChild);
            var currentPosition = getDistanceFromStart(nodeObj)["distance"];
            var targetPosition = distObj["fromNodeDistance"] + distObj["distanceBetween"] / 2;
            var offset = Math.round(targetPosition - currentPosition);
            offset !== 0 && addOffset(nodeObj, offset);
        };

        var getDistanceBetween = function(fromNode, toNode) {
            var distObj = getDistanceFromStart(fromNode);
            var startIndex = distObj["index"];
            var depthMap = toNode.depthMap;
            var distBetween = -(fromNode.dimensionMatrix[1][0]);
            for (var i = startIndex;
                (i < depthMap.length && depthMap[i] != toNode); i++) {
                distBetween += depthMap[i].getNodeWidth();
            }
            distBetween += toNode.dimensionMatrix[1][0];
            return {
                "fromNodeDistance": distObj["distance"],
                "distanceBetween": distBetween
            };
        };

        var getDistanceFromStart = function(node) {
            var distance = 0;
            var depthMap = node.depthMap;
            for (var i = 0;
                (i < depthMap.length && depthMap[i] != node); i++) {
                distance += depthMap[i].getNodeWidth();
            }
            distance += node.dimensionMatrix[1][0];
            return {
                "distance": distance,
                "index": i
            };
        };

        var addOffset = function(nodeObj, offset) {
            nodeObj.dimensionMatrix[0][0] += offset;
            nodeObj.dimensionMatrix[0][1] -= offset;
            nodeObj.dimensionMatrix[1][0] += offset;
            nodeObj.dimensionMatrix[1][2] -= offset;
            nodeObj.dimensionMatrix[2][0] += offset;
            nodeObj.dimensionMatrix[2][1] -= offset;
        };

        var getTotalDimension = function(nodes) {
            var totalSize = nodes.reduce(function(a, b) {
                var aSize = a.constructor == Node ? a.getNodeWidth() : a;
                return aSize + b.getNodeWidth();
            });
            return totalSize;
        };

        var getDimensionMatrix = function(targetSize) {
            var connectionSize = targetSize / 2;
            var nodePadding = (targetSize - 6) / 2;
            return [
                [connectionSize, connectionSize], [nodePadding, 6, nodePadding], [connectionSize, connectionSize]
            ];
        };

        var getHTMLContent = function() {
            this.htmlContent = [];
            for (var i = 0; i < this.dimensionMatrix.length; i++) {
                this.htmlContent[i] = [];
                for (var j = 0; j < this.dimensionMatrix[i].length; j++) {
                    var properties = {
                        "attributes": {}
                    };
                    var className = "";
                    if (i === 0 && !this.isRootNode) {
                        className = positionClasses[this.nodePosition][j];
                    } else if (i == 1 && j == 1) {
                        className = classes["node"];
                        this.orgChart["options"]["editable"] && (properties["attributes"]["draggable"] = "true");
                        this.tooltip.length > 0 && (properties["attributes"]["title"] = this.tooltip);
                    } else if (i == 2 && j == 1 && !this.isLeafNode) {
                        className = classes["childStub"];
                    }
                    className.length > 0 && (properties["className"] = className);
                    properties["attributes"]["colspan"] = this.dimensionMatrix[i][j];
                    var element = this.htmlContent[i][j] = createNode("td", properties);
                    if (i == 1 && j == 1) {
                        element.innerHTML = this.name;
                        element.onclick = vg.utilities.Events.bindHandler(nodeClickHandler, this);
                        element.ondblclick = vg.utilities.Events.bindHandler(nodeDblClickHandler, this);
                        element.onmouseover = vg.utilities.Events.bindHandler(mouseOverHandler, this);
                        element.onmouseout = vg.utilities.Events.bindHandler(mouseOutHandler, this);
                        this.orgChart["options"]["selectable"] && (element.onmousedown = vg.utilities.Events.bindHandler(mouseDownHandler, this));
                        this.orgChart["options"]["editable"] && setDragEvents(element, this);
                        element.nodeObject = this;
                    }
                }
            }
            return this.htmlContent;
        };

        var setDragEvents = function(elmt, nodeObject) {
            elmt.addEventListener('dragstart', vg.utilities.Events.bindHandler(handleDragStart, nodeObject), false);
            elmt.addEventListener('mouseup', vg.utilities.Events.bindHandler(handleNodeMouseUp, nodeObject), false);
        };

        var handleDragStart = function(eventObject) {
            eventObject.preventDefault && eventObject.preventDefault();
            return false;
        };

        var handleNodeMouseUp = function(eventObject) {
            var nodeToAdd = this.orgChart["currentClickedNode"];
            if (isValidAddition(nodeToAdd, this)) {
                nodeToAdd.userData["1"] = this.name;
                this.orgChart.setData(this.orgChart.userData);
                this.orgChart.draw();
            }
        };

        var isValidAddition = function(nodeToAdd, targetNode) {
            if (!nodeToAdd || nodeToAdd == targetNode || targetNode == nodeToAdd.parentNode) {
                return false;
            }
            var childNodes = nodeToAdd.orgChart["childNodeCache"][nodeToAdd.toString()];
            for (var i = 0; i < childNodes.length; i++) {
                if (targetNode == childNodes[i]) {
                    return false;
                }
            }
            return true;
        };

        var nodeClickHandler = function(eventObject) {
            var isSelectable = this.orgChart["options"]["selectable"];
            if (isSelectable) {
                this.setSelectedNode();
                eventObject.cancelBubble = true;
                eventObject.stopPropagation && eventObject.stopPropagation();
            }
            triggerUserEvent("node-click", eventObject, this);
        };

        var nodeDblClickHandler = function(eventObject) {
            triggerUserEvent("node-dbclick", eventObject, this);
        };

        var mouseOverHandler = function(eventObject) {
            this.orgChart["options"]["showHoverColors"] && this.applyNodeStyle(true, classes["node-hover"]);
            triggerUserEvent("node-hover", eventObject, this);
        };

        var mouseOutHandler = function(eventObject) {
            this.orgChart["options"]["showHoverColors"] && !this.isNodeClicked() && this.applyNodeStyle(false, classes["node-hover"]);
        };

        var mouseDownHandler = function(eventObject) {
            this.applyNodeStyle(true, classes["clicked"]);
            this.orgChart["currentClickedNode"] = this;
            this.isClicked = true;
        };

        var triggerUserEvent = function(eventType, eventObject, nodeObject) {
            eventObject = eventObject || window.event;
            nodeObject.triggerEvent(eventType, {
                "htmlEventObject": eventObject,
                "nodeObject": nodeObject
            });
        };

        var setSelectedNode = function(clearSelection) {
            var chartObj = this.orgChart;
            var currentSelected = chartObj["currentSelectedNode"];
            if (currentSelected) {
                currentSelected.applyNodeStyle(false, classes["node-select"]);
            }
            if (!clearSelection) {
                this.applyNodeStyle(true, classes["node-select"]);
                chartObj["currentSelectedNode"] = this;
            }
        };

        var applyNodeStyle = function(setStyle, className) {
            var actionFunc = !this.orgChart["options"]["highlightSubtree"] ? setNodeStyle : setSubtreeStyle;
            actionFunc(this, setStyle, className);
        };

        var setNodeStyle = function(node, isSet, className) {
            var action = isSet ? "add" : "remove";
            node.htmlContent[1][1].classList[action](className);
        };

        var setSubtreeStyle = function(node, isSet, className) {
            var action = isSet ? "add" : "remove";
            var cacheKey = node.toString();
            var childArray = node.orgChart.childNodeCache[cacheKey];
            for (var i = 0; i < childArray.length; i++) {
                var currentNode = childArray[i];
                var cells = currentNode.htmlContent;
                if (currentNode.toString() != cacheKey) {
                    cells[0][0].classList[action](className);
                    cells[0][1].classList[action](className);
                }
                cells[1][1].classList[action](className);
                !currentNode.isLeafNode && cells[2][1].classList[action](className);
            }
        };

        var toString = function() {
            return this.nodeIndex + this.name;
        };

        var collapse = function() {
            if (this.isLeafNode) {
                return undefined;
            }
            var cacheKey = this.toString();
            var childNodes = this.orgChart.childNodeCache[cacheKey];
            for (var i = 0; i < childNodes.length; i++) {
                (childNodes[i].toString() != cacheKey) && hideAll(this.isCollapsed, childNodes[i]);
            }
            this.isCollapsed = !this.isCollapsed;
            var actionFunc = this.isCollapsed ? "add" : "remove";
            this.htmlContent[1][1].classList[actionFunc](classes["collapse"]);
            this.htmlContent[2][1].classList[actionFunc](classes["collapse"]);
            return this.isCollapsed;
        };

        var hideAll = function(isVisible, nodeObj) {
            var actionFunc = isVisible ? "remove" : "add";
            nodeObj.isHidden = !isVisible;
            nodeObj.htmlContent[1][1].classList.remove(classes["collapse"]);
            nodeObj.htmlContent[2][1].classList.remove(classes["collapse"]);
            for (var i = 0; i < nodeObj.htmlContent.length; i++) {
                for (var j = 0; j < nodeObj.htmlContent[i].length; j++) {
                    nodeObj.htmlContent[i][j].classList[actionFunc](classes["visiblity"]);
                }
            }
        };

        var unclickNode = function() {
            this.isClicked = false;
            this.applyNodeStyle(false, classes["clicked"]);
            this.applyNodeStyle(false, classes["node-hover"]);
        };

        var isNodeClicked = function() {
            return this.isClicked || this.htmlContent[1][1].classList.contains(classes["clicked"]);
        };

        var getPosition = function() {
            var nodeElement = this.htmlContent[1][1];
            return {
                "x": nodeElement.offsetLeft,
                "y": nodeElement.offsetTop
            };
        };

        prototypeObject["setChildNodes"] = setChildNodes;
        prototypeObject["setParentNode"] = setParentNode;
        prototypeObject["getHTMLContent"] = getHTMLContent;
        prototypeObject["getNodeWidth"] = getNodeWidth;
        prototypeObject["setDimensions"] = setDimensions;
        prototypeObject["setSelectedNode"] = setSelectedNode;
        prototypeObject["toString"] = toString;
        prototypeObject["collapse"] = collapse;
        prototypeObject["applyNodeStyle"] = applyNodeStyle;
        prototypeObject["unclickNode"] = unclickNode;
        prototypeObject["isNodeClicked"] = isNodeClicked;
        prototypeObject["getPosition"] = getPosition;

    })(Node.prototype);

    //Property declarations
    var orgchart = function(inputObj) {
        this.options = {};
        if (inputObj) {
            if (inputObj["options"]) {
                this.options["highlightSubtree"] = inputObj["options"]["highlightSubtree"] || false;
                this.options["allowCollapse"] = inputObj["options"]["allowCollapse"] || false;
                this.options["selectable"] = inputObj["options"]["selectable"] || false;
                this.options["showHoverColors"] = inputObj["options"]["showHoverColors"] || false;
                this.options["editable"] = inputObj["options"]["editable"] || false;
            }
            this.container = inputObj["container"];
            if (this.container) {
                this["options"]["selectable"] && (this.container.onmouseup = vg.utilities.Events.bindHandler(mouseUpHandler, this));
                this["options"]["editable"] && (this.container.onmousemove = vg.utilities.Events.bindHandler(mouseMoveHandler, this));
            }
        }
        this.currentLeafNodeIndex = 0;
        this.tableRows = [];
        this.table = createTable(this);
        this.currentSelectedNode = undefined;
        this.currentClickedNode = undefined;
        this.childNodeCache = {}; //Cache of all child nodes in all levels under a node
        //node-select, node-dbclick, node-collapse, node-hover
        this.events = {};
    };

    var mouseMoveHandler = function(eventObject) {
        var subTree = this["currentDragged"];
        if (this.currentClickedNode && this.currentClickedNode != this.rootNode && !subTree) {
            subTree = this["currentDragged"] = this.getSubTree(this.currentClickedNode, {
                "options": {
                    "highlightSubtree": true
                }
            });
            subTree.rootNode.applyNodeStyle(true, classes["dragged"]);
            subTree.table.classList.add(classes["dragged"]);
            var tableWidth = (getComputedCellWidth(this) * subTree.rootNode.leafNodeCount * 8) + "px";
            subTree.table.style.width = tableWidth;
            subTree.table.style.position = "absolute";
            this.container.appendChild(subTree.table);
        }
        if (subTree) {
            var mousePos = getMousePosition(eventObject, subTree, this.container);
            subTree.setPosition(mousePos.x, mousePos.y);
        }
    };

    var getMousePosition = function(e, subTree, container) {
        var xOffset = 5;
        var yOffset = 5;
        return {
            "x": getSubtreePosition(e.clientX, container.offsetWidth, subTree.table.offsetWidth, xOffset),
            "y": getSubtreePosition(e.clientY, container.offsetHeight, subTree.table.offsetHeight, yOffset)
        };
    };

    var getSubtreePosition = function(client, container, subtree, offset) {
        var max = container - subtree - offset;
        var total = client + offset + subtree;
        return total > container ? (client - offset - subtree) : (client + offset);
    };

    var mouseUpHandler = function(eventObject) {
        this["options"]["editable"] && dragEndHandler(this);
        this.currentClickedNode && this.currentClickedNode.unclickNode();
        this.currentClickedNode = undefined;
    };

    var dragEndHandler = function(chartObj) {
        var subTree = chartObj["currentDragged"];
        if (subTree) {
            chartObj["container"].removeChild(subTree.table);
            delete chartObj["currentDragged"];
        }
    };

    var createTable = function(chartObj) {
        var table = createNode("table", {
            "className": classes["chart"],
            "attributes": {
                "cellspacing": "0"
            },
            "eventHandlers": {
                "click": vg.utilities.Events.bindHandler(tableClickHandler, chartObj)
            }
        });
        var tbody = createNode("tbody", {
            "parent": table
        });
        return table;
    };

    var tableClickHandler = function(eventObject) {
        this.currentSelectedNode && this.currentSelectedNode.setSelectedNode(true);
    };

    var arrangeData = function(chartObj) {
        var rootNode;
        for (var i = 0; i < chartObj.userData.length; i++) {
            var parent = chartObj.userData[i][1];
            var child = chartObj.userData[i][0];
            //setting node index as the 5th element
            chartObj.userData[i][4] = i;
            if (parent == child) {
                rootNode = chartObj.userData[i];
                continue;
            }!chartObj.parentToChildMap[parent] && (chartObj.parentToChildMap[parent] = []);
            chartObj.parentToChildMap[parent].push(chartObj.userData[i]);
        }
        return rootNode;
    };

    var createNodes = function(parentNodeObj, nodeData, level, nodePos) {
        var childNodes = this.parentToChildMap[nodeData[0]] || [];
        var currentNode = new Node({
            "name": nodeData[0],
            "tooltip": nodeData[2] || "",
            "data": nodeData[3] || undefined,
            "parentNode": parentNodeObj,
            "nodePosition": nodePos,
            "orgChart": this,
            "nodeIndex": nodeData[4],
            "userData": nodeData
        });
        var childLevel = level + 1;
        var childNodeObjects = [];
        var leafNodeCount = 0;
        for (var i = 0; i < childNodes.length; i++) {
            if (childNodes.length == 1) {
                var childNodePosition = "ONENODE";
            } else if (i === 0) {
                childNodePosition = "LEFTMOST";
            } else if (i == childNodes.length - 1) {
                childNodePosition = "RIGHTMOST";
            } else {
                childNodePosition = "BETWEEN";
            }
            var childNode = arguments.callee.call(this, currentNode, childNodes[i], childLevel, nodePositions[childNodePosition]);
            leafNodeCount += childNode.leafNodeCount;
            childNodeObjects.push(childNode);
        }
        currentNode.setChildNodes(childNodeObjects);
        !this.depthToLeafNodeMap[currentNode.nodeDepth] && (this.depthToLeafNodeMap[currentNode.nodeDepth] = []);
        var currentMap = this.depthToLeafNodeMap[currentNode.nodeDepth];
        currentNode.isLeafNode && (this.currentLeafNodeIndex = this.currentLeafNodeIndex + 1);
        currentNode.setDimensions(leafNodeCount, this.currentLeafNodeIndex, currentMap);
        currentMap.push(currentNode);
        addToRow(currentNode, this.tableRows);
        addToChildNodeCache(currentNode, this);
        setNodeEvents(currentNode, this);
        return currentNode;
    };

    var addToRow = function(nodeObj, rows) {
        var htmlMatrix = nodeObj.getHTMLContent();
        if (!rows[nodeObj.nodeDepth]) {
            rows[nodeObj.nodeDepth] = [createNode("tr"), createNode("tr"), createNode("tr")];
        }
        var currentArray = rows[nodeObj.nodeDepth];
        for (var i = 0; i < htmlMatrix.length; i++) {
            for (var j = 0; j < htmlMatrix[i].length; j++) {
                currentArray[i].appendChild(htmlMatrix[i][j]);
            }
        }
    };

    var addToChildNodeCache = function(nodeObj, chartObj) {
        var cacheObj = chartObj.childNodeCache;
        var key = nodeObj.toString();
        var currentArray = cacheObj[key];
        if (!currentArray) {
            currentArray = cacheObj[key] = [];
        }
        if (!nodeObj.isLeafNode) {
            nodeObj.childNodes.forEach(function(childNode, index, array) {
                currentArray.push.apply(currentArray, cacheObj[childNode.toString()]);
            });
        }
        currentArray.push(nodeObj);
    };

    /**
     * Internal Event handlers
     */
    var setNodeEvents = function(node, chartObj) {
        node.setEventListener("node-click", vg.utilities.Events.bindHandler(nodeSelectHandler, chartObj));
        node.setEventListener("node-dbclick", vg.utilities.Events.bindHandler(nodeDblClickHandler, chartObj));
        node.setEventListener("node-hover", vg.utilities.Events.bindHandler(nodeHoverHandler, chartObj));
    };

    var nodeSelectHandler = function(eventObject) {
        this.triggerEvent("node-select", eventObject);
    };

    var nodeDblClickHandler = function(eventObject) {
        if (this.options["allowCollapse"]) {
            var isCollapsed = eventObject["nodeObject"].collapse();
            eventObject["isCollapsed"] = isCollapsed;
            isCollapsed && this.triggerEvent("node-collapse", eventObject);
        }
        this.triggerEvent("node-dbclick", eventObject);
    };

    var nodeHoverHandler = function(eventObject) {
        this.triggerEvent("node-hover", eventObject);
    };

    var getComputedCellWidth = function(orgChart) {
        return orgChart.table.rows[0].cells[0].offsetWidth;
    };

    orgchart.prototype = new vg.utilities.Events(["node-select", "node-collapse", "node-dbclick", "node-hover"]);

    (function(prototypeObject) {
        var setData = function(data) {
            clearChart(this);
            this.userData = data;
            this.rootNodeData = arrangeData(this);
            if (!this.rootNodeData) {
                throw "Root Node missing for the tree";
            }
            this.rootNode = createNodes.call(this, undefined, this.rootNodeData, 0);
        };

        var clearChart = function(chartObj) {
            chartObj.parentToChildMap = {};
            chartObj.depthToLeafNodeMap = {};
            chartObj.childNodeCache = {};
            chartObj.rootNode = undefined;
            chartObj.currentLeafNodeIndex = 0;
            chartObj.tableRows = [];
            chartObj.currentSelectedNode = undefined;
            chartObj.currentClickedNode = undefined;
        };

        var draw = function() {
            var body = this.table.childNodes[0];
            body.innerHTML = "";
            var topRow = createNode("tr", {
                "parent": body
            });
            var totalCellCount = this.currentLeafNodeIndex * 8;
            for (var i = 0; i < totalCellCount; i++) {
                createNode("td", {
                    "parent": topRow
                });
            }
            for (i = 0; i < this.tableRows.length; i++) {
                for (var j = 0; j < this.tableRows[i].length; j++) {
                    body.appendChild(this.tableRows[i][j]);
                }
            }
            this.container && this.container.appendChild(this.table);
        };

        var getSubTree = function(nodeObj, inputObj) {
            var cacheKey = nodeObj.toString();
            var nodes = this.childNodeCache[cacheKey];
            var userData = [];
            if (nodes) {
                for (var i = nodes.length - 1; i >= 0; i--) {
                    var newNodeData = nodes[i]["userData"].slice(0, 2);
                    //setting current node as the root node
                    if (nodes[i] == nodeObj) {
                        newNodeData[1] = newNodeData[0];
                    }
                    userData.push(newNodeData);
                }
                var subTree = new orgchart(inputObj);
                subTree.setData(userData);
                subTree.draw();
                return subTree;
            } else {
                throw "Node not found in tree";
            }
        };

        var getData = function() {
            return this.userData;
        };

        var setVisibility = function(isVisible) {
            this.table.style.display = isVisible ? "block" : "none";
        };

        var setPosition = function(left, top) {
            this.table.style.top = top + "px";
            this.table.style.left = left + "px";
        };

        prototypeObject["setData"] = setData;
        prototypeObject["draw"] = draw;
        prototypeObject["getData"] = getData;
        prototypeObject["getSubTree"] = getSubTree;
        prototypeObject["setVisibility"] = setVisibility;
        prototypeObject["setPosition"] = setPosition;

    })(orgchart.prototype);

    (function init() {
        var cssText = ".vg-orgchart.dragged{opacity:.4}.vg-orgchart td{font-size:15px;font-weight:bold;text-align:center;width:20px;-webkit-user-select:none;-moz-user-select:none;height:10px}.node{border:3px solid #1F497D;background:#0070C0;{borderRadius};color:white;height:60px!important}.top{border-top:2px solid #1F497D}.left{border-left:2px solid #1F497D}.collapsed{border-color:#76923C}.node.collapsed{background:#9BBB59}.selected{border-color:#E36C0A}.node.selected{background:#F79646}.hover,.clicked{border-color:#F79646}.node.hover{background:#FABF8F;cursor:pointer}.node.clicked{background:#F79646}.hidden{visibility:hidden;border-color:white}.dragged{border-color:#8064A2}.node.dragged{background:#B2A1C7;cursor:pointer}";
        if (/firefox/i.test(navigator.userAgent)) {
            //To overcome firefox bug
            cssText += ".vg-orgchart{border-collapse:collapse}";
            cssText = cssText.replace("{borderRadius}", "");
        } else {
            cssText = cssText.replace("{borderRadius}", "border-radius:5px");
        }
        var styleTag = createNode("style");
        if (styleTag.innerText) {
            styleTag.innerText = cssText;
        } else {
            styleTag.innerHTML = cssText;
        }
        document.getElementsByTagName("head")[0].appendChild(styleTag);
    })();
    return orgchart;
})();
