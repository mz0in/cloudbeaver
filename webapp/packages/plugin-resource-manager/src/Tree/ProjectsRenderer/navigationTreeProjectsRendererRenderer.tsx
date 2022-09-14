/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2022 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { observer } from 'mobx-react-lite';
import styled, { css } from 'reshadow';

import { TreeNodeNestedMessage, TREE_NODE_STYLES } from '@cloudbeaver/core-blocks';
import { Translate } from '@cloudbeaver/core-localization';
import type { NavNodeInfoResource } from '@cloudbeaver/core-navigation-tree';
import { type IElementsTreeCustomRenderer, type NavigationNodeRendererComponent, useNode, NavigationNodeRenderer } from '@cloudbeaver/plugin-navigation-tree';

import { NAV_NODE_TYPE_RM_PROJECT } from '../../NAV_NODE_TYPE_RM_PROJECT';
import { NavigationNodeProjectControl } from './NavigationNodeProjectControl';

const nestedStyles = css`
  TreeNode {
    margin-top: 8px;

    &:only-child Control {
      display: none;
    }

    & NavigationNodeNested {
      padding-left: 0 !important;
    }
  }
`;

export function navigationTreeProjectsRendererRenderer(
  navNodeInfoResource: NavNodeInfoResource
): IElementsTreeCustomRenderer {

  return nodeId => {
    const node = navNodeInfoResource.get(nodeId);

    if (node?.nodeType === NAV_NODE_TYPE_RM_PROJECT) {
      return ProjectRenderer;
    }

    return undefined;
  };
}

const ProjectRenderer: NavigationNodeRendererComponent = observer(function ManageableGroup({
  nodeId,
  path,
  dragging,
  component,
  className,
  expanded,
}) {
  const { node } = useNode(nodeId);

  if (!node) {
    return styled(TREE_NODE_STYLES)(
      <TreeNodeNestedMessage>
        <Translate token='app_navigationTree_node_not_found' />
      </TreeNodeNestedMessage>
    );
  }

  return (
    <NavigationNodeRenderer
      node={node}
      path={path}
      expanded={expanded}
      dragging={dragging}
      className={className}
      control={NavigationNodeProjectControl}
      style={nestedStyles}
      component={component}
    />
  );
});
