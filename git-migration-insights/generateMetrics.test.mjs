import { describe, it } from "node:test";

import { strict as assert } from "node:assert";

import { v1Analyzer, v2Analyzer } from "./generateMetrics.mjs";

describe("Analyzers", () => {
  describe("v1Analyzer", () => {
    it.skip("should return 1 for simple declaration", async () => {
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

    it.skip("should return 2 for multiple declaration", async () => {
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

    it.skip("should handle heritage", async () => {
      // Given
      const code = `
        class SearchSampleController extends SearchController {
          static getInstance() {
            return new SearchSampleController();
          }
        }
      `;

      // When
      const count = await v1Analyzer(code);

      // Then
      assert.strictEqual(count, 1);
    });

    it("count squad", async () => {
      // Given
      const code = `
      const Controller = require('../../../Controller');
      const joi = require('../../../../../commons/helpers/joi');
      const {
        listUserSubmittedTasks,
      } = require('../../../../models/polling/listUserSubmittedTasks');
      const {
        requirePermission,
      } = require('../../../../../commons/authorizations/requirePermission');
      
      const inputSchema = joi.object().keys({
        offset: joi.number().default(0).positive(),
        limit: joi.number().default(10).min(1).max(50),
      });
      
      /**
       * @typedef {import("../../../../sequelize/polling/submitted_tasks/entity").SubmittedTasks} SubmittedTasks
       */
      
      /**
       *
       * @param {*} req
       * @param {{ json: (params: SubmittedTasks[]) => void }} res
       */
      async function handler(req, res) {
        const { offset, limit } = req.verifySchema(inputSchema);
      
        const results = await listUserSubmittedTasks({
          userId: req.current_user.id,
          offset,
          limit,
        });
        return res.json(results);
      }
      
      module.exports = new Controller({
        method: 'get',
        route: '/api/taskqueue/tasks',
        middlewares: [requirePermission('read_taskqueue', 404)],
        handler,
        domain: Controller.DOMAINS.TASK_QUEUE,
      });
      
      `;

      // When
      const count = await v1Analyzer(code);

      // Then
      assert.strictEqual(count, 1);
    });

    it("count inherit squad", async () => {
      // Given
      const code = `
      const Controller = require('../../Controller');
const trackSearchRequest = require('../../../../commons/search/tracking/trackSearchRequest');
const ErrorWithStatus = require('../../../../commons/error/ErrorWithStatus');
const { seo } = require('../../../sequelize');
const validateSchema = require('../../../models/validateSchema');
const {
  searchQuerySchemaController,
} = require('../../search/queryParams/searchQuerySchemaController');
const {
  getSearchResults,
} = require('../../../models/search/searchResults/getSearchResults');
const { shouldFetchPreparatoryWork } = require('./shouldFetchPreparatoryWork');

const processQuery = require('../../../models/search/autocomplete/processQuery');
const removeQueryFromCompletions = require('../../../models/search/autocomplete/removeQueryFromCompletions');
const getSuggestionsForQuery = require('../../../models/search/autocomplete/getSuggestionsForQuery');

class TopicController extends Controller {
  static getInstance() {
    return new TopicController();
  }

  constructor() {
    super({
      method: 'get',
      route: '/api/topic/:slug',
      domain: Controller.DOMAINS.TOPICS,
    });
  }

  // retrieve search query suggestions
  async getSuggestionsResults(query, suggestionsSize, userId) {
    const processedSearchQuery = await processQuery(query);

    let completions = await getSuggestionsForQuery(
      processedSearchQuery,
      suggestionsSize,
      userId,
    );

    completions = removeQueryFromCompletions(query, completions);

    return completions.map((c) => c.suggestion);
  }

  // typed search query execution
  async getSearchResults(req, from, size, type, query) {
    const queryParams = validateSchema(
      {
        query,
        type,
        from,
        size,
      },
      searchQuerySchemaController,
    );

    const {
      ret_query_info,
      response: searchResponse,
      results,
    } = await getSearchResults(queryParams, {
      currentUser: req.current_user,
      searchOptions: {
        current_user: req.current_user,
        show_scores: false,
        show_explanations: false,
      },
    });

    const endProcessingTime = new Date().getTime();
    const search_time = endProcessingTime - req.received_at;

    trackSearchRequest(
      req,
      ret_query_info,
      { ...searchResponse, search_time, processing_time: search_time },
      results,
    );

    return searchResponse;
  }

  async handler(req, res, next) {
    const { slug } = req.params;
    if (!slug) throw new ErrorWithStatus(404, 'Not Found', true);

    const searchSize = 10; // searches results limit
    const suggestionsSize = 10; // suggestions results limit

    const user = req.current_user;
    const userId = user && user.logged_in ? user.id : null;

    const topic = await seo.topic.findOne({ where: { slug } });
    if (!topic) throw new ErrorWithStatus(404, 'Not Found', true);

    const [
      resultsDecisions,
      resultsCommentaries,
      resultsLaw,
      resultsPreparatoryWork,
      resultsSuggestions,
    ] = await Promise.all([
      this.getSearchResults(req, 0, searchSize, 'arret', topic.search_query),
      this.getSearchResults(
        req,
        0,
        searchSize,
        'commentary',
        topic.search_query,
      ),
      this.getSearchResults(req, 0, searchSize, 'law', topic.search_query),
      shouldFetchPreparatoryWork(slug)
        ? this.getSearchResults(
            req,
            0,
            searchSize,
            'preparatory_work',
            topic.search_query,
          )
        : undefined,
      this.getSuggestionsResults(topic.search_query, suggestionsSize, userId),
    ]);

    return res.json({
      title: topic.title,
      description: topic.description,
      h1: topic.h1,
      suggestions: resultsSuggestions,
      searches: {
        decisions: resultsDecisions,
        commentaries: resultsCommentaries,
        law: resultsLaw,
        preparatoryWork: resultsPreparatoryWork,
      },
    });
  }
}

module.exports = TopicController;

      `;

      // When
      const count = await v1Analyzer(code);

      // Then
      assert.strictEqual(count, 1);
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
