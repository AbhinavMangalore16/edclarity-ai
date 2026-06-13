# Contributing to EdClarity.ai

First off, thank you for considering contributing to EdClarity.ai! It's people like you that make EdClarity.ai such a great tool for the educational community.

## Where do I go from here?

If you've noticed a bug or have a feature request, make one! It's generally best if you get confirmation of your bug or approval for your feature request before starting to code.

## Fork & create a branch

If this is something you think you can fix, then fork EdClarity.ai and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-add-agentic-rag
```

## Get the test suite running

Make sure you're using Node.js version 18 or newer.

```sh
npm install
npm run dev
```

Ensure that all dependencies install correctly and you can start the application locally. Make sure you set up the appropriate `.env.local` variables as outlined in the `README.md`.

## Implement your fix or feature

At this point, you're ready to make your changes. Feel free to ask for help; everyone is a beginner at first!

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with EdClarity.ai's master branch:

```sh
git remote add upstream git@github.com:yourusername/edclarity-ai.git
git checkout master
git pull upstream master
```

Then update your feature branch from your local copy of master, and push it!

```sh
git checkout 325-add-agentic-rag
git rebase master
git push --set-upstream origin 325-add-agentic-rag
```

Finally, go to GitHub and make a Pull Request! Your code will be reviewed by our AI code reviewer (CodeRabbit) and then by a maintainer.

## Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

## Development Guidelines
- **UI Components:** We use `shadcn/ui` and `Tailwind CSS`. Try to reuse existing components located in `src/components/ui/` before creating new ones.
- **State Management:** Use standard React hooks for local state and React Query / SWR for server state if needed.
- **Typing:** Ensure all new code is strictly typed with TypeScript. Avoid using `any`.
- **Linting:** Run `npm run lint` and resolve any warnings or errors before submitting your PR.
