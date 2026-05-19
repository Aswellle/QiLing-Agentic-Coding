/**
 * WebFetch preapproved domains — adapted from CC's tools/WebFetchTool/preapproved.ts
 *
 * SECURITY WARNING: These domains are ONLY for WebFetch (GET requests).
 * The sandbox system deliberately does NOT inherit this list for network
 * restrictions — arbitrary network access (POST, uploads) to these domains
 * could enable data exfiltration.
 *
 * Allows GET-only access to well-known code documentation and development
 * resources without requiring explicit user permission rules.
 */

export const PREAPPROVED_HOSTS = new Set([
  // Anthropic
  'platform.claude.com', 'code.claude.com', 'modelcontextprotocol.io',
  'github.com/anthropics', 'agentskills.io',

  // Programming Language Docs
  'docs.python.org', 'en.cppreference.com', 'docs.oracle.com',
  'learn.microsoft.com', 'developer.mozilla.org', 'go.dev', 'pkg.go.dev',
  'www.php.net', 'docs.swift.org', 'kotlinlang.org', 'ruby-doc.org',
  'doc.rust-lang.org', 'www.typescriptlang.org',

  // Web/JS Frameworks
  'react.dev', 'angular.io', 'vuejs.org', 'nextjs.org', 'expressjs.com',
  'nodejs.org', 'bun.sh', 'jquery.com', 'getbootstrap.com', 'tailwindcss.com',
  'd3js.org', 'threejs.org', 'redux.js.org', 'webpack.js.org', 'jestjs.io',
  'reactrouter.com',

  // Python Frameworks
  'docs.djangoproject.com', 'flask.palletsprojects.com', 'fastapi.tiangolo.com',
  'pandas.pydata.org', 'numpy.org', 'www.tensorflow.org', 'pytorch.org',
  'scikit-learn.org', 'matplotlib.org', 'requests.readthedocs.io', 'jupyter.org',

  // PHP Frameworks
  'laravel.com', 'symfony.com', 'wordpress.org',

  // Java Frameworks
  'docs.spring.io', 'hibernate.org', 'tomcat.apache.org', 'gradle.org',
  'maven.apache.org',

  // .NET
  'asp.net', 'dotnet.microsoft.com', 'nuget.org', 'blazor.net',

  // Mobile
  'reactnative.dev', 'docs.flutter.dev', 'developer.apple.com',
  'developer.android.com',

  // Data Science/ML
  'keras.io', 'spark.apache.org', 'huggingface.co', 'www.kaggle.com',

  // Databases
  'www.mongodb.com', 'redis.io', 'www.postgresql.org', 'dev.mysql.com',
  'www.sqlite.org', 'graphql.org', 'prisma.io',

  // Cloud/DevOps
  'docs.aws.amazon.com', 'cloud.google.com', 'kubernetes.io', 'www.docker.com',
  'www.terraform.io', 'www.ansible.com', 'vercel.com/docs', 'docs.netlify.com',
  'devcenter.heroku.com',

  // Testing/Monitoring
  'cypress.io', 'selenium.dev',

  // Game Dev
  'docs.unity.com', 'docs.unrealengine.com',

  // Essential Tools
  'git-scm.com', 'nginx.org', 'httpd.apache.org',
])

// Split at module load: O(1) Set.has() for hostname-only, prefix check for path-scoped
const { HOSTNAME_ONLY, PATH_PREFIXES } = (() => {
  const hosts = new Set<string>()
  const paths = new Map<string, string[]>()
  for (const entry of PREAPPROVED_HOSTS) {
    const slash = entry.indexOf('/')
    if (slash === -1) {
      hosts.add(entry)
    } else {
      const host = entry.slice(0, slash)
      const path = entry.slice(slash)
      const prefixes = paths.get(host)
      if (prefixes) prefixes.push(path)
      else paths.set(host, [path])
    }
  }
  return { HOSTNAME_ONLY: hosts, PATH_PREFIXES: paths }
})()

/**
 * Check if a hostname+pathname is in the preapproved list.
 * Path-scoped entries (e.g. "github.com/anthropics") enforce segment boundaries
 * to prevent prefix-matching attacks (e.g., "/anthropics-evil" must not match).
 */
export function isPreapprovedHost(hostname: string, pathname: string): boolean {
  if (HOSTNAME_ONLY.has(hostname)) return true
  const prefixes = PATH_PREFIXES.get(hostname)
  if (prefixes) {
    for (const p of prefixes) {
      if (pathname === p || pathname.startsWith(p + '/')) return true
    }
  }
  return false
}
