export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'style', 'docs', 'test', 'chore', 'ci', 'revert', 'build'],
    ],
    'subject-max-length': [2, 'always', 100],
  },
};
