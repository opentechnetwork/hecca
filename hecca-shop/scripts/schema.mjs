// Print the exact argument/field shape for Shopify GraphQL mutations and inputs.
//
//   node scripts/schema.mjs productCreate productVariantsBulkUpdate
//   node scripts/schema.mjs --input ProductCreateInput
//
// Guessing at GraphQL signatures wastes API calls; this reads them from the
// live schema of whatever API version is pinned in .env.
import { graphql } from "./shopify.mjs";

const argv = process.argv.slice(2);
const inputNames = argv.filter((a) => argv[argv.indexOf(a) - 1] === "--input");
const wantMutations = argv.filter((a) => !a.startsWith("--") && !inputNames.includes(a));

const typeRef = (t) => {
  if (!t) return "";
  if (t.kind === "NON_NULL") return `${typeRef(t.ofType)}!`;
  if (t.kind === "LIST") return `[${typeRef(t.ofType)}]`;
  return t.name ?? "";
};

const FIELD_Q = `query {
  __type(name: "Mutation") {
    fields(includeDeprecated: false) {
      name
      args { name type { kind name ofType { kind name ofType { kind name } } } }
    }
  }
}`;

const INPUT_Q = `query($name: String!) {
  __type(name: $name) {
    name
    kind
    inputFields(includeDeprecated: true) { name type { kind name ofType { kind name ofType { kind name } } } }
    enumValues(includeDeprecated: false) { name }
  }
}`;

if (wantMutations.length) {
  const d = await graphql(FIELD_Q);
  const byName = new Map(d.__type.fields.map((f) => [f.name, f]));
  for (const name of wantMutations) {
    const f = byName.get(name);
    if (!f) {
      console.log(`✗ mutation "${name}" not found in this API version`);
      continue;
    }
    console.log(`\nmutation ${f.name}(`);
    for (const a of f.args) console.log(`  ${a.name}: ${typeRef(a.type)},`);
    console.log(`)`);
  }
}

for (const name of inputNames) {
  const d = await graphql(INPUT_Q, { name });
  const t = d.__type;
  if (!t) {
    console.log(`✗ type "${name}" not found`);
    continue;
  }
  console.log(`\n${t.kind} ${t.name} {`);
  for (const f of t.inputFields ?? []) console.log(`  ${f.name}: ${typeRef(f.type)},`);
  for (const e of t.enumValues ?? []) console.log(`  ${e.name}`);
  console.log(`}`);
}
