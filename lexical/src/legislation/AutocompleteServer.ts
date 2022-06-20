import { useCallback } from "react";
import { LegislationType } from "./rich/RichLegislationNode";
import data from "./data.json";

const LEGISLATIONS: LegislationType[] = data;

type SearchPromise = {
  dismiss: () => void;
  promise: Promise<null | LegislationType[]>;
};

/*
 * Simulate an asynchronous autocomplete server (typical in more common use cases like GMail where
 * the data is not static).
 */
class AutocompleteServer {
  DATABASE = LEGISLATIONS;
  LATENCY = 200;

  query = (searchText: string): SearchPromise => {
    let isDismissed = false;

    const dismiss = () => {
      isDismissed = true;
    };
    const promise: Promise<null | LegislationType[]> = new Promise(
      (resolve, reject) => {
        setTimeout(() => {
          if (isDismissed) {
            // TODO cache result
            return reject("Dismissed");
          }
          const searchTextLength = searchText.length;
          if (searchText === "" || searchTextLength < 4) {
            return resolve(null);
          }
          const char0 = searchText.charCodeAt(0);
          const isCapitalized = char0 >= 65 && char0 <= 90;
          const caseInsensitiveSearchText = isCapitalized
            ? String.fromCharCode(char0 + 32) + searchText.substring(1)
            : searchText;
          const matchs = this.DATABASE.filter(
            (dictionaryWord) =>
              dictionaryWord.title
                .toLocaleLowerCase()
                .startsWith(caseInsensitiveSearchText) ?? null
          );

          return resolve(matchs);
        }, this.LATENCY);
      }
    );

    return {
      dismiss,
      promise,
    };
  };
}

export function useQuery(): (searchText: string) => SearchPromise {
  return useCallback((searchText: string) => {
    const server = new AutocompleteServer();
    console.time("query");
    const response = server.query(searchText);
    console.timeEnd("query");
    return response;
  }, []);
}
