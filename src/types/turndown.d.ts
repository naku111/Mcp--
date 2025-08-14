declare module 'turndown' {
  export interface Rule {
    filter: string | string[] | ((node: any) => boolean);
    replacement: (content: string, node?: any) => string;
  }

  export interface Options {
    headingStyle?: 'setext' | 'atx';
    codeBlockStyle?: 'indented' | 'fenced';
  }

  export default class TurndownService {
    constructor(options?: Options);
    addRule(key: string, rule: Rule): this;
    turndown(html: string): string;
  }
}