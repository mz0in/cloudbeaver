/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2021 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { observable, makeObservable } from 'mobx';

import { AdministrationScreenService } from '@cloudbeaver/core-administration';
import { ActionSnackbarProps, PlaceholderContainer } from '@cloudbeaver/core-blocks';
import { DEFAULT_NAVIGATOR_VIEW_SETTINGS } from '@cloudbeaver/core-connections';
import { injectable } from '@cloudbeaver/core-di';
import { INotification, NotificationService } from '@cloudbeaver/core-events';
import { IExecutor, Executor, IExecutorHandler, ExecutorInterrupter } from '@cloudbeaver/core-executor';
import { ServerConfigResource } from '@cloudbeaver/core-root';

import type { IServerConfigurationPageState } from './IServerConfigurationPageState';

export interface IConfigurationPlaceholderProps {
  configurationWizard: boolean;
  state: IServerConfigurationPageState;
}

export interface IServerConfigSaveData {
  state: IServerConfigurationPageState;
  configurationWizard: boolean;
  finish: boolean;
}

export interface ILoadConfigData {
  state: IServerConfigurationPageState;
  reset: boolean;
}

@injectable()
export class ServerConfigurationService {
  state: IServerConfigurationPageState;
  loading: boolean;

  readonly loadConfigTask: IExecutor<ILoadConfigData>;
  readonly prepareConfigTask: IExecutor<IServerConfigSaveData>;
  readonly saveTask: IExecutor<IServerConfigSaveData>;
  readonly validationTask: IExecutor<IServerConfigSaveData>;
  readonly configurationContainer: PlaceholderContainer<IConfigurationPlaceholderProps>;
  readonly pluginsContainer: PlaceholderContainer;

  private done: boolean;
  private stateLinked: boolean;
  private unSaveNotification: INotification<ActionSnackbarProps> | null;

  constructor(
    private readonly administrationScreenService: AdministrationScreenService,
    private readonly serverConfigResource: ServerConfigResource,
    private readonly notificationService: NotificationService,
  ) {
    makeObservable<ServerConfigurationService, 'done'>(this, {
      state: observable,
      loading: observable,
      done: observable,
    });

    this.stateLinked = false;
    this.done = false;
    this.loading = true;
    this.state = serverConfigStateContext();
    this.unSaveNotification = null;
    this.loadConfigTask = new Executor();
    this.prepareConfigTask = new Executor();
    this.saveTask = new Executor();
    this.validationTask = new Executor();
    this.configurationContainer = new PlaceholderContainer();
    this.pluginsContainer = new PlaceholderContainer();

    this.loadConfigTask
      .next(this.validationTask, () => this.getSaveData(false))
      .addHandler(() => { this.loading = true; })
      .addHandler(this.loadServerConfig)
      .addPostHandler(() => {
        this.loading = false;
        this.showUnsavedNotification();
      });

    this.saveTask
      .before(this.validationTask)
      .before(this.prepareConfigTask)
      .addPostHandler(this.save);

    this.validationTask
      .addHandler(this.validateForm)
      .addPostHandler(this.ensureValidation);

    this.serverConfigResource.onDataUpdate.addPostHandler(this.showUnsavedNotification.bind(this));
  }

  changed(): void {
    this.done = false;
  }

  deactivate(): void {
    this.showUnsavedNotification();
  }

  async loadConfig(reset = false): Promise<void> {
    try {
      if (!this.stateLinked) {
        this.state = this.administrationScreenService.getItemState(
          'server-configuration',
          () => {
            reset = true;
            return this.state;
          }
        );
        this.serverConfigResource.setDataUpdate(this.state.serverConfig);
        this.serverConfigResource.setNavigatorSettingsUpdate(this.state.navigatorConfig);

        this.stateLinked = true;
      }

      await this.loadConfigTask.execute({
        state: this.state,
        reset,
      });
    } catch (exception) {
      this.notificationService.logException(exception, 'Can\'t load server configuration');
    }
  }

  isDone(): boolean {
    return this.done;
  }

  async saveConfiguration(finish: boolean): Promise<boolean> {
    const contexts = await this.saveTask.execute(this.getSaveData(finish));

    const validation = contexts.getContext(serverConfigValidationContext);

    return validation.getState();
  }

  private loadServerConfig: IExecutorHandler<ILoadConfigData> = async (data, contexts) => {
    if (!data.reset) {
      return;
    }

    try {
      const config = await this.serverConfigResource.load();

      if (!config) {
        return;
      }

      data.state.serverConfig.serverName = config.name || config.productInfo.name;
      data.state.serverConfig.sessionExpireTime = config.sessionExpireTime;

      data.state.serverConfig.adminCredentialsSaveEnabled = config.adminCredentialsSaveEnabled;
      data.state.serverConfig.publicCredentialsSaveEnabled = config.publicCredentialsSaveEnabled;
      data.state.serverConfig.customConnectionsEnabled = config.supportsCustomConnections;

      Object.assign(data.state.navigatorConfig, config.defaultNavigatorSettings);
    } catch (exception) {
      ExecutorInterrupter.interrupt(contexts);
      this.notificationService.logException(exception, 'Can\'t load server configuration');
    }
  };

  private getSaveData(finish: boolean): IServerConfigSaveData {
    return {
      state: this.state,
      finish,
      configurationWizard: this.administrationScreenService.isConfigurationMode,
    };
  }

  private save: IExecutorHandler<IServerConfigSaveData> = async (data, contexts) => {
    const validation = contexts.getContext(serverConfigValidationContext);

    if (!validation.getState()) {
      return;
    }

    try {
      await this.serverConfigResource.saveDefaultNavigatorSettings();
      if (!data.configurationWizard || data.finish) {
        await this.serverConfigResource.save();
      }
    } catch (exception) {
      this.notificationService.logException(exception, 'Can\'t save server configuration');

      throw exception;
    }
  };

  private ensureValidation: IExecutorHandler<IServerConfigSaveData> = (data, contexts) => {
    const validation = contexts.getContext(serverConfigValidationContext);

    if (!validation.getState()) {
      ExecutorInterrupter.interrupt(contexts);
      this.done = false;
    } else {
      this.done = true;
    }
  };

  private validateForm: IExecutorHandler<IServerConfigSaveData> = (data, contexts) => {
    const validation = contexts.getContext(serverConfigValidationContext);

    if (!this.isFormFilled(data.state)) {
      validation.invalidate();
    }
  };

  private isFormFilled(state: IServerConfigurationPageState) {
    if (!state.serverConfig.serverName) {
      return false;
    }
    if ((state.serverConfig.sessionExpireTime ?? 0) < 1) {
      return false;
    }
    return true;
  }

  private showUnsavedNotification() {
    if (
      !this.serverConfigResource.isChanged()
      && !this.serverConfigResource.isNavigatorSettingsChanged()
    ) {
      this.unSaveNotification?.close(true);
      return;
    }

    if (this.unSaveNotification || this.administrationScreenService.isConfigurationMode) {
      return;
    }

    this.unSaveNotification = this.notificationService.logInfo({
      title: 'administration_configuration_wizard_configuration_server_info_unsaved',
      persistent: true,
      onClose: () => { this.unSaveNotification = null; },
    });
  }
}

export interface IValidationStatusContext {
  getState: () => boolean;
  invalidate: () => void;
}

export function serverConfigValidationContext(): IValidationStatusContext {
  let state = true;

  const invalidate = () => {
    state = false;
  };
  const getState = () => state;

  return {
    getState,
    invalidate,
  };
}

export function serverConfigStateContext(): IServerConfigurationPageState {
  return {
    navigatorConfig: { ...DEFAULT_NAVIGATOR_VIEW_SETTINGS },
    serverConfig: {},
  };
}
