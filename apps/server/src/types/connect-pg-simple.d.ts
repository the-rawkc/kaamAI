declare module "connect-pg-simple" {
  import { type Store } from "express-session";

  function connectPgSimple(session: typeof import("express-session")): typeof Store;

  export default connectPgSimple;
}
