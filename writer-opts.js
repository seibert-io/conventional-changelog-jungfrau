'use strict';

const compareFunc = require(`compare-func`);
const Q = require(`q`);
const readFile = Q.denodeify(require(`fs`).readFile);
const resolve = require(`path`).resolve;

module.exports = Q.all([
	readFile(resolve(__dirname, `./templates/template.hbs`), `utf-8`),
	readFile(resolve(__dirname, `./templates/header.hbs`), `utf-8`),
	readFile(resolve(__dirname, `./templates/commit.hbs`), `utf-8`),
	readFile(resolve(__dirname, `./templates/footer.hbs`), `utf-8`)
]).spread((template, header, commit, footer) => {
	const writerOpts = getWriterOpts();

	writerOpts.mainTemplate = template;
	writerOpts.headerPartial = header;
	writerOpts.commitPartial = commit;
	writerOpts.footerPartial = footer;

	return writerOpts;
});

function getWriterOpts() {
	return {
		transform: (commit, context) => {
			let discard = true;
			const issues = [];

			commit.notes.forEach(note => {
				note.title = `BREAKING CHANGES`;
				discard = false;
			});

			if (commit.type === `feat`) {
				commit.type = `Features`;
			} else if (commit.type === `fix`) {
				commit.type = `Bug Fixes`;
			} else if (commit.type === `perf`) {
				commit.type = `Performance Improvements`;
			} else if (commit.type === `revert`) {
				commit.type = `Reverts`;
			} else if (discard) {
				return;
			} else if (commit.type === `docs`) {
				commit.type = `Documentation`;
			} else if (commit.type === `style`) {
				commit.type = `Styles`;
			} else if (commit.type === `refactor`) {
				commit.type = `Code Refactoring`;
			} else if (commit.type === `test`) {
				commit.type = `Tests`;
			} else if (commit.type === `build`) {
				commit.type = `Build System`;
			} else if (commit.type === `ci`) {
				commit.type = `Continuous Integration`;
			}

			if (commit.scope === `*`) {
				commit.scope = ``;
			}

			if (typeof commit.hash === `string`) {
				commit.hash = commit.hash.substring(0, 7);
			}
			
			if (context.packageData && context.packageData.bugs && context.packageData.bugs.issueBaseUrl && context.packageData.bugs.issuePattern) {
				const issueRegex = new RegExp(`(${context.packageData.bugs.issuePattern})`, 'gi');

				if (typeof commit.subject === `string`) {
					commit.subject = commit.subject.replace(issueRegex, (_, issue) => {
						issues.push(issue);
						return `[${issue}](${context.packageData.bugs.issueBaseUrl}${issue})`;
					});
				}

				// include body references in the subject
				if (typeof commit.body === `string`) {
					const issueMatches = commit.body.match(issueRegex);
					if (issueMatches) {
						commit.subject = `${commit.subject} ${issueMatches
							.map(issue => {
								issues.push(issue);
								return `[${issue}](${context.packageData.bugs.issueBaseUrl}${issue})`;
							})
							.join(' ')}`;
					}
				}

				// include all remaining references in the subject
				commit.references = commit.references.filter(reference => {
					if (issues.indexOf(reference.issue) === -1) {
						commit.subject = `${commit.subject} [${reference.issue}](${context.packageData.bugs.issueBaseUrl}${reference.issue})`;
					}

					return false;
				});
			}

			return commit;
		},
		groupBy: `type`,
		commitGroupsSort: `title`,
		commitsSort: [`scope`, `subject`],
		noteGroupsSort: `title`,
		notesSort: compareFunc
	};
}
