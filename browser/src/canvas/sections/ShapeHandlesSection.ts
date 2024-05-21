/* global Proxy _ */
/*
 * Copyright the Collabora Online contributors.
 *
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/*
	This class is for the modifier handles of shape objects.
	Shape is rendered on the core side. Only the handles are drawn here and modification commands are sent to the core side.
*/

class ShapeHandlesSection extends CanvasSectionObject {
	name: string = "shapeHandlesSection";
	processingOrder: number = L.CSections.DefaultForDocumentObjects.processingOrder;
	drawingOrder: number = L.CSections.DefaultForDocumentObjects.drawingOrder;
	zIndex: number = L.CSections.DefaultForDocumentObjects.zIndex;
	documentObject: boolean = true;
	showSection: boolean = false;

	constructor (info: any) {
        super();

		this.sectionProperties.info = null;
		this.sectionProperties.handles = [];
		this.sectionProperties.subSections = [];
		this.sectionProperties.activeHandleIndex = null;
		this.sectionProperties.mouseIsInside = false;
		this.sectionProperties.handleWidth = 20;
		this.sectionProperties.handleHeight = 20;
		this.sectionProperties.subSectionPrefix = 'shape-handle-';
		this.sectionProperties.previousCursorStyle = null;
		this.sectionProperties.bevel = 0;
		this.sectionProperties.xMultiplier = 1;
		this.sectionProperties.yMultiplier = 1;
		this.sectionProperties.perpendicular = false;
		this.sectionProperties.horizontal = false;
		this.sectionProperties.embeddedSvg = null;

		this.refreshInfo(info);
	}

	public refreshInfo(info: any) {
		this.sectionProperties.info = info;
		this.getHandles();
		this.updateSize();
		this.updateSubSections();
		this.calculateRotationAngle();
	}

	calculateRotationAngle() {
		if (!this.sectionProperties.info?.handles?.kinds?.rectangle)
			return;

		const coordThree = [parseInt(this.sectionProperties.info.handles.kinds.rectangle['2'][0].point.x), parseInt(this.sectionProperties.info.handles.kinds.rectangle['2'][0].point.y)];
		const coordSeven = [parseInt(this.sectionProperties.info.handles.kinds.rectangle['7'][0].point.x), parseInt(this.sectionProperties.info.handles.kinds.rectangle['7'][0].point.y)];

		const dx = coordThree[0] - coordSeven[0];
		const dy = coordSeven[1] - coordThree[1];

		this.sectionProperties.bevel = 0;
		this.sectionProperties.perpendicular = false;
		this.sectionProperties.horizontal = false;

		if (dx !== 0 && dy !== 0) {
			this.sectionProperties.bevel = dy / dx;
		}
		else if (dx === 0)
			this.sectionProperties.perpendicular = true;
		else if (dy === 0)
			this.sectionProperties.horizontal = true;

		if (coordThree[0] < coordSeven[0]) this.sectionProperties.xMultiplier = -1; else this.sectionProperties.xMultiplier = 1;
		if (coordSeven[1] < coordThree[1]) this.sectionProperties.yMultiplier = -1; else this.sectionProperties.yMultiplier = 1;
	}

	// Get the handle positions and other information from the info that core side sent us.
	getHandles() {
		this.sectionProperties.handles = [];

		const halfWidth = app.pixelsToTwips * (this.sectionProperties.handleWidth * 0.5);
		const halfHeight = app.pixelsToTwips * (this.sectionProperties.handleHeight * 0.5);

		if (this.sectionProperties.info?.handles?.kinds?.rectangle) {
			const topLeft = this.sectionProperties.info.handles.kinds.rectangle['1'][0];
			const topMiddle = this.sectionProperties.info.handles.kinds.rectangle['2'][0];
			const topRight = this.sectionProperties.info.handles.kinds.rectangle['3'][0];
			const middleLeft = this.sectionProperties.info.handles.kinds.rectangle['4'][0];
			const middleRight = this.sectionProperties.info.handles.kinds.rectangle['5'][0];
			const bottomLeft = this.sectionProperties.info.handles.kinds.rectangle['6'][0];
			const bottomMiddle = this.sectionProperties.info.handles.kinds.rectangle['7'][0];
			const bottomRight = this.sectionProperties.info.handles.kinds.rectangle['8'][0];

			this.sectionProperties.handles.push({ info: topLeft, point: new app.definitions.simplePoint(topLeft.point.x - halfWidth, topLeft.point.y - halfHeight) });
			this.sectionProperties.handles.push({ info: topMiddle, point: new app.definitions.simplePoint(topMiddle.point.x - halfWidth, topMiddle.point.y - halfHeight) });
			this.sectionProperties.handles.push({ info: topRight, point: new app.definitions.simplePoint(topRight.point.x - halfWidth, topRight.point.y - halfHeight) });
			this.sectionProperties.handles.push({ info: middleLeft, point: new app.definitions.simplePoint(middleLeft.point.x - halfWidth, middleLeft.point.y - halfHeight) });
			this.sectionProperties.handles.push({ info: middleRight, point: new app.definitions.simplePoint(middleRight.point.x - halfWidth, middleRight.point.y - halfHeight) });
			this.sectionProperties.handles.push({ info: bottomLeft, point: new app.definitions.simplePoint(bottomLeft.point.x - halfWidth, bottomLeft.point.y - halfHeight) });
			this.sectionProperties.handles.push({ info: bottomMiddle, point: new app.definitions.simplePoint(bottomMiddle.point.x - halfWidth, bottomMiddle.point.y - halfHeight) });
			this.sectionProperties.handles.push({ info: bottomRight, point: new app.definitions.simplePoint(bottomRight.point.x - halfWidth, bottomRight.point.y - halfHeight) });
		}

		if (this.sectionProperties.info?.handles?.kinds?.anchor) {
			const anchor = this.sectionProperties.info.handles.kinds.anchor['16'][0];
			this.sectionProperties.handles.push({ info: anchor, point: new app.definitions.simplePoint(anchor.point.x - halfWidth, anchor.point.y - halfHeight) });
		}
	}

	// Update this section's size according to handle coordinates.
	updateSize() {
		this.size = [0, 0];

		const topLeft: number[] = [Infinity, Infinity];
		const bottomRight: number[] = [-Infinity, -Infinity];

		for (let i = 0; i < this.sectionProperties.handles.length; i++) {
			if (this.sectionProperties.handles[i].info.kind !== '16') { // 16 is the anchor point.
				if (this.sectionProperties.handles[i].point.pX < topLeft[0]) topLeft[0] = this.sectionProperties.handles[i].point.pX;
				if (this.sectionProperties.handles[i].point.pY < topLeft[1]) topLeft[1] = this.sectionProperties.handles[i].point.pY;
				if (this.sectionProperties.handles[i].point.pX > bottomRight[0]) bottomRight[0] = this.sectionProperties.handles[i].point.pX;
				if (this.sectionProperties.handles[i].point.pY > bottomRight[1]) bottomRight[1] = this.sectionProperties.handles[i].point.pY;
			}
		}
		if (topLeft[0] !== Infinity)
			this.size = [bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]];
	}

	clearUnneededSubSections() {
		for (let i = 0; i < this.sectionProperties.subSections.length; i++) {
			let found = false;
			for (let j = 0; j < this.sectionProperties.handles.length; j++) {
				if (this.sectionProperties.subSections[i].name === this.sectionProperties.subSectionPrefix + this.sectionProperties.handles[i].info.kind) {
					found = true;
					break;
				}
			}

			if (!found) {
				// Section kind is not included in current handles list. Remove the section.
				this.containerObject.removeSection(this.sectionProperties.subSections[i].name);
			}
		}
	}

	hasVisibleEmbeddedSVG() {

	}

	removeEmbeddedSVG() {
		if (this.sectionProperties.embeddedSvg) {
			this._pathNodeCollection.forEachNode(function (nodeData) {
				var svgNode = nodeData.getCustomField('svg');
				L.DomUtil.remove(svgNode);
				nodeData.clearCustomField('svg');
			});

			this._dragShapePresent = false;
			this._hasSVGNode = false;
			this._update();
		}
	}

	addEmbeddedSVG(data: string) {
		var svgDoc = this.parseSVG(svgString);

		if (svgDoc.lastChild.localName !== 'svg')
			return;

		var svgLastChild = svgDoc.lastChild;
		var thisObj = this;
		this._forEachGroupNode(function (groupNode, rectNode, nodeData) {
			var svgNode = groupNode.insertBefore(svgLastChild, rectNode);
			nodeData.setCustomField('svg', svgNode);
			nodeData.setCustomField('dragShape', rectNode);
			thisObj._dragShapePresent = true;
			svgNode.setAttribute('pointer-events', 'none');
			svgNode.setAttribute('opacity', thisObj._dragStarted ? 1 : 0);
		});

		this._hasSVGNode = true;

		this.sizeSVG();
		this._update();
	}

	showEmbeddedSVG() {

	}

	onSectionShowStatusChange() {
		for (let i = 0; i < this.sectionProperties.subSections.length; i++)
			this.sectionProperties.subSections[i].setShowSection(this.showSection);
	}

	addOrModifySubSections() {
		for (let i = 0; i < this.sectionProperties.handles.length; i++) {
			let found = false;
			const name = this.sectionProperties.subSectionPrefix + this.sectionProperties.handles[i].info.kind;
			for (let j = 0; j < this.sectionProperties.subSections.length; j++) {
				if (this.sectionProperties.subSections[j].name === name)
					found = true;
			}

			if (found) {
				const section = this.containerObject.getSectionWithName(name);
				section.setPosition(this.sectionProperties.handles[i].point.pX, this.sectionProperties.handles[i].point.pY);
				section.sectionProperties.ownInfo = this.sectionProperties.handles[i].info;
			}
			else {
				// Current handles list contain a kind that has no sub section yet.
				let newSubSection: ShapeHandleScalingSubSection | ShapeHandleAnchorSubSection = null;
				if (this.sectionProperties.handles[i].info.kind === '16') {
					newSubSection = new app.definitions.shapeHandleAnchorSubSection(
						this,
						this.sectionProperties.subSectionPrefix + this.sectionProperties.handles[i].info.kind,
						[this.sectionProperties.handleWidth, this.sectionProperties.handleHeight],
						this.sectionProperties.handles[i].point.clone(),
						this.sectionProperties.handles[i].info
					);
				}
				else {
					newSubSection = new app.definitions.shapeHandleScalingSubSection(
						this,
						this.sectionProperties.subSectionPrefix + this.sectionProperties.handles[i].info.kind,
						[this.sectionProperties.handleWidth, this.sectionProperties.handleHeight],
						this.sectionProperties.handles[i].point.clone(),
						this.sectionProperties.handles[i].info
					);
				}

				this.containerObject.addSection(newSubSection as CanvasSectionObject);
				this.sectionProperties.subSections.push(newSubSection);
			}
		}
	}

	/*
		Sub sections are for handles. We first need to check if current sections' names overlap with the newly needed ones.
		Then we add new ones or clean / update current ones.
	*/
	updateSubSections() {
		this.clearUnneededSubSections();
		this.addOrModifySubSections();
	}

	onMouseEnter() {
		this.sectionProperties.previousCursorStyle = this.context.canvas.style.cursor;
		this.context.canvas.style.cursor = 'move';
		this.sectionProperties.mouseIsInside = true;
	}

	onMouseLeave() {
		this.context.canvas.style.cursor = this.sectionProperties.previousCursorStyle;
		this.sectionProperties.mouseIsInside = false;
	}

	onMouseMove(position: number[]) {
		return;
	}

	public onDraw() {
		const centerX = parseInt(this.sectionProperties.info.handles.kinds.rectangle['2'][0].point.x) * app.twipsToPixels - this.position[0];
		const centerY = parseInt(this.sectionProperties.info.handles.kinds.rectangle['2'][0].point.y) * app.twipsToPixels - this.position[1];
		const diff = 30;
		let x: number;
		let y: number;

		if (!this.sectionProperties.perpendicular && !this.sectionProperties.horizontal) {
			const dx = Math.pow(Math.pow(diff, 2) / (Math.pow(1 + this.sectionProperties.bevel, 2)), 0.5);
			x = centerX + dx * this.sectionProperties.xMultiplier;
			y = centerY - dx * this.sectionProperties.bevel * this.sectionProperties.yMultiplier;
		}
		else if (this.sectionProperties.perpendicular) {
			x = centerX;
			y = centerY - diff * this.sectionProperties.yMultiplier;
		}
		else if (this.sectionProperties.horizontal) {
			x = centerX + diff * this.sectionProperties.xMultiplier;
			y = centerY;
		}

		this.context.strokeStyle = 'grey';
		this.context.beginPath();
		this.context.arc(x, y, this.sectionProperties.handleWidth * 0.5, 0, 2 * Math.PI);
		this.context.stroke();
	}
}

app.definitions.shapeHandlesSection = ShapeHandlesSection;
