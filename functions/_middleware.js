/* eslint-env serviceworker */

export async function onRequest(context) {
  const { request } = context;

  const url = new URL(request.url);

  if (url.hostname === "alifaniani.pages.dev") {
    const target = new URL("https://alifaniani.ir");

    target.pathname = url.pathname;
    target.search = url.search;

    return Response.redirect(target.toString(), 301);
  }

  return context.next();
}