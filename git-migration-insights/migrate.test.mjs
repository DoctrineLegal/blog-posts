import { describe, it } from "node:test";

import { strict as assert } from "node:assert";

import { analyzer } from "./migrate.mjs";

describe("Analyzers", () => {
  describe("analyzer", () => {
    it("should return 1 for simple declaration", async () => {
      // Given
      const code = `import React, { FC } from 'react';

          import { Hyperlink } from '@doctrinelegal/design-system/button';
          import { MaterialIcon } from '@doctrinelegal/design-system/material-icon';
          import { FormattedMessage } from 'react-intl';

          import styles from './ContactSuccess.module.scss';

          export const ContactSuccess: FC<React.PropsWithChildren<unknown>> = () => (
            <div className={styles.container}>
              <MaterialIcon name="check_circle" className={styles.icon} />
              <div className={styles.text}>
                <h1>
                  <FormattedMessage id="contact/ContactSuccess.tsx/1" />
                </h1>
                <h2>
                  <FormattedMessage id="contact/ContactSuccess.tsx/2" />
                </h2>
              </div>
              <div className={styles.link}>
                <Hyperlink variant="secondary" color="brand" href="/" source="contact">
                  <FormattedMessage id="contact/ContactSuccess.tsx/3" defaultMessage={\`fake label 3\`} />
                </Hyperlink>
              </div>
            </div>
          );`;

      // When
      const result = await analyzer({
        code,
        dictionary: {
          "contact/ContactSuccess.tsx/1": "fake label 1",
          "contact/ContactSuccess.tsx/2": "fake label 2",
        },
        filePath: "test",
      });

      // Then
      assert.deepStrictEqual(result.keysToDelete, [
        "contact/ContactSuccess.tsx/1",
        "contact/ContactSuccess.tsx/2",
      ]);
      assert.strictEqual(
        result.updateCode,
        `import React, { FC } from 'react';

          import { Hyperlink } from '@doctrinelegal/design-system/button';
          import { MaterialIcon } from '@doctrinelegal/design-system/material-icon';
          import { FormattedMessage } from 'react-intl';

          import styles from './ContactSuccess.module.scss';

          export const ContactSuccess: FC<React.PropsWithChildren<unknown>> = () => (
            <div className={styles.container}>
              <MaterialIcon name="check_circle" className={styles.icon} />
              <div className={styles.text}>
                <h1>
                  <FormattedMessage id="contact/ContactSuccess.tsx/1" defaultMessage={\`fake label 1\`} />
                </h1>
                <h2>
                  <FormattedMessage id="contact/ContactSuccess.tsx/2" defaultMessage={\`fake label 2\`} />
                </h2>
              </div>
              <div className={styles.link}>
                <Hyperlink variant="secondary" color="brand" href="/" source="contact">
                  <FormattedMessage id="contact/ContactSuccess.tsx/3" defaultMessage={\`fake label 3\`} />
                </Hyperlink>
              </div>
            </div>
          );`
      );
    });
  });
});
