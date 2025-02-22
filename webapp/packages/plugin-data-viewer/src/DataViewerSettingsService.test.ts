/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2024 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */
import '@testing-library/jest-dom';

import { coreAdministrationManifest } from '@cloudbeaver/core-administration';
import { coreAppManifest } from '@cloudbeaver/core-app';
import { coreAuthenticationManifest } from '@cloudbeaver/core-authentication';
import { mockAuthentication } from '@cloudbeaver/core-authentication/dist/__custom_mocks__/mockAuthentication';
import { coreBrowserManifest } from '@cloudbeaver/core-browser';
import { coreClientActivityManifest } from '@cloudbeaver/core-client-activity';
import { coreConnectionsManifest } from '@cloudbeaver/core-connections';
import { coreDialogsManifest } from '@cloudbeaver/core-dialogs';
import { coreEventsManifest } from '@cloudbeaver/core-events';
import { coreLocalizationManifest } from '@cloudbeaver/core-localization';
import { coreNavigationTree } from '@cloudbeaver/core-navigation-tree';
import { corePluginManifest } from '@cloudbeaver/core-plugin';
import { coreProductManifest } from '@cloudbeaver/core-product';
import { coreProjectsManifest } from '@cloudbeaver/core-projects';
import { coreRootManifest, ServerConfigResource } from '@cloudbeaver/core-root';
import { createGQLEndpoint } from '@cloudbeaver/core-root/dist/__custom_mocks__/createGQLEndpoint';
import { mockAppInit } from '@cloudbeaver/core-root/dist/__custom_mocks__/mockAppInit';
import { mockGraphQL } from '@cloudbeaver/core-root/dist/__custom_mocks__/mockGraphQL';
import { mockServerConfig } from '@cloudbeaver/core-root/dist/__custom_mocks__/resolvers/mockServerConfig';
import { coreRoutingManifest } from '@cloudbeaver/core-routing';
import { coreSDKManifest } from '@cloudbeaver/core-sdk';
import { coreSettingsManifest } from '@cloudbeaver/core-settings';
import { coreThemingManifest } from '@cloudbeaver/core-theming';
import { coreUIManifest } from '@cloudbeaver/core-ui';
import { coreViewManifest } from '@cloudbeaver/core-view';
import { datasourceContextSwitchPluginManifest } from '@cloudbeaver/plugin-datasource-context-switch';
import { navigationTabsPlugin } from '@cloudbeaver/plugin-navigation-tabs';
import { navigationTreePlugin } from '@cloudbeaver/plugin-navigation-tree';
import { objectViewerManifest } from '@cloudbeaver/plugin-object-viewer';
import { createApp } from '@cloudbeaver/tests-runner';

import { DataViewerSettings, DataViewerSettingsService } from './DataViewerSettingsService';
import { dataViewerManifest } from './manifest';

const endpoint = createGQLEndpoint();
const app = createApp(
  dataViewerManifest,
  coreLocalizationManifest,
  coreEventsManifest,
  corePluginManifest,
  coreProductManifest,
  coreRootManifest,
  coreSDKManifest,
  coreBrowserManifest,
  coreSettingsManifest,
  coreViewManifest,
  coreAuthenticationManifest,
  coreProjectsManifest,
  coreUIManifest,
  coreRoutingManifest,
  coreAdministrationManifest,
  coreConnectionsManifest,
  coreDialogsManifest,
  coreNavigationTree,
  coreAppManifest,
  coreThemingManifest,
  datasourceContextSwitchPluginManifest,
  navigationTreePlugin,
  navigationTabsPlugin,
  objectViewerManifest,
  coreClientActivityManifest,
);

const server = mockGraphQL(...mockAppInit(endpoint), ...mockAuthentication(endpoint));

beforeAll(() => app.init());

const testValueDeprecated = true;
const testValueNew = false;

const deprecatedSettings = {
  'core.app.dataViewer': {
    disableEdit: testValueDeprecated,
  } as DataViewerSettings,
};

const newSettings = {
  ...deprecatedSettings,
  plugin: {
    'data-viewer': {
      disableEdit: testValueNew,
    } as DataViewerSettings,
  },
};

async function setupSettingsService(mockConfig: any = {}) {
  const settings = app.injector.getServiceByClass(DataViewerSettingsService);
  const config = app.injector.getServiceByClass(ServerConfigResource);

  server.use(endpoint.query('serverConfig', mockServerConfig(mockConfig)));

  await config.refresh();

  return settings;
}

test('New settings override deprecated settings', async () => {
  const settingsService = await setupSettingsService(newSettings);

  expect(settingsService.settings.getValue('disableEdit')).toBe(testValueNew);
});

test('Deprecated settings are used if new settings are not defined', async () => {
  const settingsService = await setupSettingsService(deprecatedSettings);

  expect(settingsService.settings.getValue('disableEdit')).toBe(testValueDeprecated);
});

describe('DataViewerSettingsService.getDefaultRowsCount', () => {
  let settingsService: DataViewerSettingsService = null as any;

  beforeAll(async () => {
    settingsService = await setupSettingsService({
      plugin: {
        'data-viewer': {
          fetchMin: 200,
          fetchMax: 1000,
          fetchDefault: 300,
        },
      },
    });
  });

  test('should return valid value', () => {
    expect(settingsService.getDefaultRowsCount(400)).toBe(400);
  });

  test('should return valid default value', () => {
    expect(settingsService.getDefaultRowsCount()).toBe(300);
  });

  test('should return valid minimal value', () => {
    expect(settingsService.getDefaultRowsCount(10)).toBe(200);
  });

  test('should return valid maximal value', () => {
    expect(settingsService.getDefaultRowsCount(1100)).toBe(1000);
  });
});
