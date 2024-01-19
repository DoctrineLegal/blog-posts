import { describe, it } from "node:test";

import { strict as assert } from "node:assert";

import { v1Analyzer, v2Analyzer } from "./generateMetrics.mjs";

describe("Analyzers", () => {
  describe("v1Analyzer", () => {
    it("should return 1 for simple declaration", async () => {
      // Given
      const code = `
        module.exports = new Controller({
          method: 'post',
          route: '/annotate',
          middlewares: [requirePermission('access_premium')],
          handler: setFolderAnnotations,
          domain: Controller.DOMAINS.FOLDERS,
        });
      `;

      // When
      const count = await v1Analyzer(code);

      // Then
      assert.strictEqual(count, 1);
    });

    it("should return 2 for multiple declaration", async () => {
      // Given
      const code = `
        module.exports = new Controller({
          method: 'post',
          route: '/annotate',
          middlewares: [requirePermission('access_premium')],
          handler: setFolderAnnotations,
          domain: Controller.DOMAINS.FOLDERS,
        });

        module.exports = new Controller({
          method: 'get',
          route: '/annotate',
          middlewares: [requirePermission('access_premium')],
          handler: getFolderAnnotations,
          domain: Controller.DOMAINS.FOLDERS,
        });
      `;

      // When
      const count = await v1Analyzer(code);

      // Then
      assert.strictEqual(count, 2);
    });
  });
  describe("v2Analyzer", () => {
    it("should return 1 for simple declaration", async () => {
      // Given
      const code = `
      @Reporting({ scope: 'FOLDERS' })
      @ApiTags('Folders')
      @Controller('folders')
      export class FolderController {
        constructor(
          private readonly folderService: FolderService,
        ) {}
      
        @Post('/')
        @Permissions('access_premium')
        async createFolder(
          @User() user: AuthenticatedUser,
          @Body() { title }: CreateFolderDto,
        ) {
          const userId = user.id;
      
          try {
            const folder = await this.folderService.create(title, userId);
      
            return folder;
          } catch (error) {
            if (error instanceof FoldersError) {
              throw new BadRequestException(error.message, error.name);
            }
            throw error;
          }
        }
      }
      `;

      // When
      const count = await v2Analyzer(code);

      // Then
      assert.strictEqual(count, 1);
    });

    it("should return 2 for multiple declaration", async () => {
      // Given
      const code = `
      @Reporting({ scope: 'FOLDERS' })
      @ApiTags('Folders')
      @Controller('folders')
      export class FolderController {
        constructor(
          private readonly folderService: FolderService,
        ) {}

        @Get('/:id')
        @Permissions('access_premium')
        async createFolder(
          @Params('id') id: string,
        ) {
          return this.folderService.getById(id)
        }
      
        @Post('/')
        @Permissions('access_premium')
        async createFolder(
          @User() user: AuthenticatedUser,
          @Body() { title }: CreateFolderDto,
        ) {
          const userId = user.id;
      
          try {
            const folder = await this.folderService.create(title, userId);
      
            return folder;
          } catch (error) {
            if (error instanceof FoldersError) {
              throw new BadRequestException(error.message, error.name);
            }
            throw error;
          }
        }
      }
      `;

      // When
      const count = await v2Analyzer(code);

      // Then
      assert.strictEqual(count, 2);
    });
  });
});
