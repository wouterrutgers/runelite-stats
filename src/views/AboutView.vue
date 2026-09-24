<script setup>
const base = import.meta.env.BASE_URL
</script>

<template>
  <div class="page about-page">
    <header class="page-heading">
      <h1>About RuneLite Hub Stats</h1>
      <p>Install counts and development activity, collected from RuneLite and GitHub.</p>
    </header>
    <div class="about-grid">
      <article class="prose">
        <section>
          <h2>Data sources</h2>
          <p>
            Plugin names, authors and availability come from RuneLite’s manifest. Install counts
            come from RuneLite’s Plugin Hub API. Repository links and pull request history come from
            <a href="https://github.com/runelite/plugin-hub">runelite/plugin-hub</a>.
          </p>
          <p>
            The collector runs every six hours. Each page shows when its data was last collected.
          </p>
          <p>
            Other useful sites include
            <a href="https://riktenx.github.io/runelite-plugin-hub-metrics/">Plugin Hub metrics</a>
            and <a href="https://runelite.phyce.dev/">RuneLite Plugin Stats</a>.
          </p>
        </section>
        <section>
          <h2>Install history</h2>
          <p>
            RuneLite’s API only provides current install counts. Graphs on this site start when
            collection began; older counts are not available. GitHub pull request history goes back
            to the start of the repository.
          </p>
          <p>
            The 48h chart uses six hour samples. Longer ranges use the first sample of each UTC day.
            Observed highs include every collection, so peaks between daily samples are still
            recorded.
          </p>
        </section>
        <section>
          <h2>Growth rankings</h2>
          <p>
            Each comparison uses the closest recorded count at or before the selected time. The
            periods are 1, 7, 30, 180 and 365 days. Missing counts stay missing.
          </p>
          <p>
            New plugins and plugins growing from zero installs are labelled New. An older plugin
            with no recorded comparison count shows No baseline. Percentage rankings require at
            least 100 installs at both ends of the comparison. New &amp; rising requires 50 installs
            and publication within the last 30 days.
          </p>
          <p>
            Install totals count each plugin separately. A player with ten plugins contributes ten
            installs.
          </p>
        </section>
        <section>
          <h2>Pull requests and review times</h2>
          <p>
            Weeks start on Monday in UTC. Weekly charts exclude the unfinished current week. Backlog
            counts show how many pull requests remained open at the end of each week.
          </p>
          <p>
            Resolution time runs from opening a pull request to merging or closing it. It includes
            waiting for author revisions and is not a measure of time spent reviewing. Both merged
            and closed requests contribute to the median and 90th percentile.
          </p>
          <p>
            Plugin additions, updates and removals come from changes to direct files under
            <code>plugins/</code>. Clear renames are linked on plugin pages, but each ID keeps its
            own install history.
          </p>
          <p>
            The historical plugin count is inferred from merged changes and includes disabled
            entries. Direct commits outside pull requests and past disabled status cannot be fully
            reconstructed.
          </p>
        </section>
        <section>
          <h2>Author credits</h2>
          <p>
            Names come from each plugin’s manifest. Plugins can credit several people, and each
            author gets the plugin’s full install count. Developer totals therefore overlap.
            Combined growth includes only plugins with a recorded comparison count.
          </p>
          <p>
            Original credits are kept on plugin pages. These names may differ from GitHub usernames.
          </p>
        </section>
      </article>
      <aside>
        <section class="panel source-card">
          <h2>Links and downloads</h2>
          <a href="https://runelite.net/plugin-hub/">RuneLite Plugin Hub ↗</a>
          <a href="https://static.runelite.net/bootstrap.json">RuneLite bootstrap ↗</a>
          <a href="https://github.com/runelite/plugin-hub">Plugin Hub repository ↗</a>
          <a :href="`${base}data/summary.json`" download>Dashboard data (JSON)</a>
          <a :href="`${base}data/plugins.json`" download>Plugin directory (JSON)</a>
          <a :href="`${base}data/hub/weekly.json`" download>Weekly activity (JSON)</a>
        </section>
      </aside>
    </div>
  </div>
</template>
