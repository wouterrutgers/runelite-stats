<template>
  <div class="page about-page">
    <header class="page-heading">
      <h1>About RuneLite Hub Stats</h1>
      <p>
        Find popular plugins, discover what is growing, and follow new additions to the Plugin Hub.
      </p>
    </header>
    <div class="about-grid">
      <article class="prose">
        <section>
          <h2>Explore the Plugin Hub</h2>
          <p>
            Browse popular, new, and growing plugins. Each plugin page brings together its install
            history, release details, credited authors, and recent changes.
          </p>
        </section>
        <section>
          <h2>Follow Plugin Hub activity</h2>
          <p>
            See which plugins are new or recently updated, and explore the developers credited with
            creating them.
          </p>
        </section>
        <section>
          <h2>How to read the numbers</h2>
          <p>
            Install counts are recorded per plugin, so a player with several plugins appears in
            several totals. Historical charts start when collection began, and counts refresh every
            six hours.
          </p>
          <p>
            Author pages follow the credits shown in each plugin’s listing. When a plugin has more
            than one credited author, their totals can overlap.
          </p>
        </section>
        <section>
          <h2>Where the information comes from</h2>
          <p>
            Plugin details and install counts come from the RuneLite Plugin Hub. Plugin changes and
            pull request history come from its
            <a href="https://github.com/runelite/plugin-hub">public repository</a>.
          </p>
        </section>
      </article>
      <aside>
        <section class="panel source-card">
          <h2>Start exploring</h2>
          <RouterLink to="/plugins">Browse the plugin directory</RouterLink>
          <RouterLink to="/growth">See what is growing</RouterLink>
          <RouterLink to="/developers">Explore developer profiles</RouterLink>
          <RouterLink to="/hub">View Hub activity</RouterLink>
          <a href="https://runelite.net/plugin-hub/">Open the RuneLite Plugin Hub ↗</a>
          <a href="https://github.com/wouterrutgers/runelite-stats" target="_blank" rel="noreferrer"
            >View this project on GitHub ↗</a
          >
        </section>
      </aside>
    </div>
  </div>
</template>
