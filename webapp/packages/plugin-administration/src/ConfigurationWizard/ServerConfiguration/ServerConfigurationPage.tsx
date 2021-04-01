/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2021 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { observer } from 'mobx-react-lite';
import styled, { css } from 'reshadow';

import { AdministrationItemContentComponent, AdministrationTools, ADMINISTRATION_TOOLS_STYLES } from '@cloudbeaver/core-administration';
import { BASE_CONTAINERS_STYLES, ColoredContainer, Container, Group, GroupItem, GroupTitle, IconButton, Loader, Placeholder, SubmittingForm, useFocus, useFormValidator } from '@cloudbeaver/core-blocks';
import { useController, useService } from '@cloudbeaver/core-di';
import { useTranslate } from '@cloudbeaver/core-localization';
import { ServerConfigResource } from '@cloudbeaver/core-root';
import { useStyles } from '@cloudbeaver/core-theming';

import { ServerConfigurationConfigurationForm } from './Form/ServerConfigurationConfigurationForm';
import { ServerConfigurationInfoForm } from './Form/ServerConfigurationInfoForm';
import { ServerConfigurationNavigatorViewForm } from './Form/ServerConfigurationNavigatorViewForm';
import { ServerConfigurationSecurityForm } from './Form/ServerConfigurationSecurityForm';
import { ServerConfigurationPageController } from './ServerConfigurationPageController';
import { ServerConfigurationService } from './ServerConfigurationService';

const styles = css`
  SubmittingForm {
    flex: 1;
    display: flex;
    overflow: auto;
    flex-direction: column;
  }

  p {
    white-space: pre-wrap;
    line-height: 2;
  }
`;

export const ServerConfigurationPage: AdministrationItemContentComponent = observer(function ServerConfigurationPage({
  configurationWizard,
}) {
  const translate = useTranslate();
  const style = useStyles(styles, ADMINISTRATION_TOOLS_STYLES, BASE_CONTAINERS_STYLES);
  const [focusedRef] = useFocus<HTMLFormElement>({ focusFirstChild: true });
  const serverConfigResource = useService(ServerConfigResource);
  const service = useService(ServerConfigurationService);
  const controller = useController(ServerConfigurationPageController);
  const changed = serverConfigResource.isChanged()
    || serverConfigResource.isNavigatorSettingsChanged(service.state.navigatorConfig);
  useFormValidator(service.validationTask, focusedRef);

  return styled(style)(
    <SubmittingForm ref={focusedRef} name='server_config' onSubmit={controller.save} onChange={controller.change}>
      {controller.editing && (
        <AdministrationTools>
          <IconButton name="admin-save" viewBox="0 0 28 28" disabled={!changed} onClick={controller.save} />
          <IconButton name="admin-cancel" viewBox="0 0 28 28" disabled={!changed} onClick={controller.reset} />
        </AdministrationTools>
      )}
      <ColoredContainer wrap gap overflow parent>
        {!controller.editing && (
          <Group form>
            <GroupItem>
              <h3>{translate('administration_configuration_wizard_configuration_title')}</h3>
            </GroupItem>
            <GroupItem>
              <p>{translate('administration_configuration_wizard_configuration_message')}</p>
            </GroupItem>
          </Group>
        )}

        <Loader state={service}>
          {() => styled(style)(
            <Container wrap gap>
              <ServerConfigurationInfoForm state={controller.state} />
              <Group form gap medium>
                <GroupTitle>{translate('administration_configuration_wizard_configuration_plugins')}</GroupTitle>
                <ServerConfigurationConfigurationForm serverConfig={controller.state.serverConfig} />
                <ServerConfigurationNavigatorViewForm configs={controller.state} />
                <Placeholder container={service.pluginsContainer} />
              </Group>
              <ServerConfigurationSecurityForm serverConfig={controller.state.serverConfig} />
              <Placeholder
                container={service.configurationContainer}
                configurationWizard={configurationWizard}
                state={controller.state}
              />
            </Container>
          )}
        </Loader>
      </ColoredContainer>
    </SubmittingForm>
  );
});
