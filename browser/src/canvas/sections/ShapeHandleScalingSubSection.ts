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
	This class is for the sub sections (handles) of ShapeHandlesSection.
	Shape is rendered on the core side. Only the handles are drawn here and modification commands are sent to the core side.
*/

class ShapeHandleScalingSubSection extends CanvasSectionObject {
    processingOrder: number = L.CSections.DefaultForDocumentObjects.processingOrder;
	drawingOrder: number = L.CSections.DefaultForDocumentObjects.drawingOrder + 1; // Handle events before the parent section.
	zIndex: number = L.CSections.DefaultForDocumentObjects.zIndex;
    documentObject: boolean = true;
    borderColor: string = 'grey'; // borderColor and backgroundColor are used so we don't need an "onDraw" function for now.
    backgroundColor: string = null;

	constructor (parentHandlerSection: ShapeHandlesSection, sectionName: string, size: number[], documentPosition: cool.SimplePoint, ownInfo: any) {
        super();

        this.name = sectionName;
        this.size = size;
        this.position = [documentPosition.pX, documentPosition.pY];

		this.sectionProperties.parentHandlerSection = parentHandlerSection;
		this.sectionProperties.ownInfo = ownInfo;
		this.sectionProperties.mouseIsInside = false;
		this.sectionProperties.mousePointerType = null;
		this.sectionProperties.previousCursorStyle = null;

		this.setMousePointerType();
	}

	setMousePointerType() {
		if (this.sectionProperties.ownInfo.kind === '1')
			this.sectionProperties.mousePointerType = 'w-resize';
		else if (this.sectionProperties.ownInfo.kind === '2')
			this.sectionProperties.mousePointerType = 'sw-resize';
		else if (this.sectionProperties.ownInfo.kind === '3')
			this.sectionProperties.mousePointerType = 'ew-resize';
		else if (this.sectionProperties.ownInfo.kind === '4')
			this.sectionProperties.mousePointerType = 'ew-resize';
		else if (this.sectionProperties.ownInfo.kind === '5')
			this.sectionProperties.mousePointerType = 'se-resize';
		else if (this.sectionProperties.ownInfo.kind === '6')
			this.sectionProperties.mousePointerType = 'sw-resize';
		else if (this.sectionProperties.ownInfo.kind === '7')
			this.sectionProperties.mousePointerType = 'w-resize';
		else if (this.sectionProperties.ownInfo.kind === '8')
			this.sectionProperties.mousePointerType = 'w-resize';
	}

	onMouseEnter(point: number[], e: MouseEvent) {
		this.backgroundColor = 'grey';
		this.sectionProperties.previousCursorStyle = this.context.canvas.style.cursor;
		this.context.canvas.style.cursor = this.sectionProperties.mousePointerType;
		this.stopPropagating();
		e.stopPropagation();
		this.containerObject.requestReDraw();
	}

	onMouseLeave(point: number[], e: MouseEvent) {
		this.context.canvas.style.cursor = this.sectionProperties.previousCursorStyle;
		this.backgroundColor = null;
		this.stopPropagating();
		e.stopPropagation();
		this.containerObject.requestReDraw();

	}

	onMouseUp(point: number[], e: MouseEvent): void {
		if (this.containerObject.isDraggingSomething()) {
			console.log('was dragging');
			const parameters = {
				HandleNum: { type: 'long', value: this.sectionProperties.ownInfo.id },
				NewPosX: { type: 'long', value: Math.round((point[0] + this.position[0]) * app.pixelsToTwips) },
				NewPosY: { type: 'long', value: Math.round((point[1] + this.position[1]) * app.pixelsToTwips) }
			};

			app.map.sendUnoCommand('.uno:MoveShapeHandle', parameters);

			this.stopPropagating();
			e.stopPropagation();
		}
	}

	onMouseMove(point: Array<number>, dragDistance: Array<number>, e: MouseEvent) {
		if (this.containerObject.isDraggingSomething()) {
			this.stopPropagating();
			e.stopPropagation();
		}
	}
}

app.definitions.shapeHandleScalingSubSection = ShapeHandleScalingSubSection;
