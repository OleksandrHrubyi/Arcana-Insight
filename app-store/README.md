# App Store Public Pages

This folder is deployable as a static site through GitHub Pages.

## Expected public URLs

If GitHub Pages is enabled for this repository through GitHub Actions, the URLs will be:

- `https://oleksandrhrubyi.github.io/Arcana-Insight/`
- `https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html`
- `https://oleksandrhrubyi.github.io/Arcana-Insight/support.html`

## One-time GitHub setup

1. Open the GitHub repository settings.
2. Go to `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Save the setting.
5. Push this branch to `main` or run the `Deploy App Store Pages` workflow manually.

Important:

- This first enablement must be done manually in GitHub UI by a repo admin.
- The workflow token can deploy an existing Pages site, but it may not have permission to create the Pages site for the repository.

## App Store Connect fields

Use these after the site is live:

- Privacy Policy URL: `https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html`
- Support URL: `https://oleksandrhrubyi.github.io/Arcana-Insight/support.html`
