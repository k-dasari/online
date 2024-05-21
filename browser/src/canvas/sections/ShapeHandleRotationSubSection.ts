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

class ShapeHandleRotationSubSection extends CanvasSectionObject {
	documentObject: boolean = true;

	constructor (parentHandlerSection: ShapeHandlesSection, sectionName: string, size: number[], documentPosition: cool.SimplePoint, ownInfo: any) {
        super();

        this.sectionProperties.parentHandlerSection = parentHandlerSection;
		this.sectionProperties.ownInfo = ownInfo;
		this.sectionProperties.mouseIsInside = false;
	}

	onMouseEnter() {
		this.backgroundColor = 'grey';
		this.containerObject.requestReDraw();
	}

	onMouseLeave() {
		this.backgroundColor = null;
		this.containerObject.requestReDraw();
	}

	onMouseMove(position: number[]) {
        return;
	}
}

app.definitions.shapeHandleRotationSubSection = ShapeHandleRotationSubSection;
