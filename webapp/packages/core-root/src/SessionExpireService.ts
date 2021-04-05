/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2021 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { Bootstrap, injectable } from '@cloudbeaver/core-di';
import { Executor, IExecutor } from '@cloudbeaver/core-executor';
import {
  GQLError, GraphQLService, EServerErrorCode
} from '@cloudbeaver/core-sdk';

import { SessionError } from './SessionError';

@injectable()
export class SessionExpireService extends Bootstrap {
  sessionExpired = false;

  onSessionExpire: IExecutor;
  constructor(
    private graphQLService: GraphQLService
  ) {
    super();
    this.onSessionExpire = new Executor();
  }

  register(): void {
    this.graphQLService.registerInterceptor(this.sessionExpiredInterceptor.bind(this));
  }

  load(): void {}

  private async sessionExpiredInterceptor(request: Promise<any>): Promise<any> {
    try {
      return await request;
    } catch (exception) {
      if (exception instanceof GQLError
        && exception.errorCode === EServerErrorCode.sessionExpired
        && !this.sessionExpired) {
        const e = new SessionError('Session expired');
        this.graphQLService.blockRequests(e);
        this.sessionExpired = true;
        await this.onSessionExpire.execute();
      }
      throw exception;
    }
  }
}
