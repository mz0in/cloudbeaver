/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2024 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import { ConnectionsManagerService } from '@cloudbeaver/core-connections';
import { Bootstrap, injectable } from '@cloudbeaver/core-di';
import { ProjectInfoResource } from '@cloudbeaver/core-projects';
import { CachedMapAllKey, getCachedMapResourceLoaderState } from '@cloudbeaver/core-resource';
import { EAdminPermission, PermissionsService } from '@cloudbeaver/core-root';
import { ActionService, DATA_CONTEXT_MENU, MenuService } from '@cloudbeaver/core-view';
import { MENU_CONNECTIONS } from '@cloudbeaver/plugin-connections';

import { ACTION_CONNECTION_SEARCH } from './Actions/ACTION_CONNECTION_SEARCH';
import { ConnectionSearchSettingsService } from './ConnectionSearchSettingsService';
import { ConnectionSearchService } from './Search/ConnectionSearchService';

@injectable()
export class SearchConnectionPluginBootstrap extends Bootstrap {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly projectInfoResource: ProjectInfoResource,
    private readonly connectionSearchService: ConnectionSearchService,
    private readonly connectionsManagerService: ConnectionsManagerService,
    private readonly menuService: MenuService,
    private readonly actionService: ActionService,
    private readonly connectionSearchSettingsService: ConnectionSearchSettingsService,
  ) {
    super();
  }

  register(): void | Promise<void> {
    this.menuService.addCreator({
      isApplicable: context => context.tryGet(DATA_CONTEXT_MENU) === MENU_CONNECTIONS,
      getItems: (context, items) => [...items, ACTION_CONNECTION_SEARCH],
    });

    this.actionService.addHandler({
      id: 'connection-search',
      isActionApplicable: (context, action) => [ACTION_CONNECTION_SEARCH].includes(action),
      isHidden: (context, action) => {
        if (this.connectionsManagerService.createConnectionProjects.length === 0 || !this.permissionsService.has(EAdminPermission.admin)) {
          return true;
        }

        if (action === ACTION_CONNECTION_SEARCH) {
          return this.connectionSearchSettingsService.settings.getValue('disabled');
        }

        return false;
      },
      getLoader: (context, action) => getCachedMapResourceLoaderState(this.projectInfoResource, () => CachedMapAllKey),
      handler: async (context, action) => {
        switch (action) {
          case ACTION_CONNECTION_SEARCH: {
            this.connectionSearchService.open();
            break;
          }
        }
      },
    });
  }

  load(): void | Promise<void> {}
}
