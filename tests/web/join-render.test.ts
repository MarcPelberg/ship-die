import { describe, expect, it } from "vitest";
import { load } from "cheerio";
import { renderHome, renderJoin } from "../../src/web/render.js";

describe("request-to-join form", () => {
  it("links from the archive and labels all three visible application fields", () => {
    const archive = load(renderHome({ query: "", type: "", cards: [] }));
    expect(archive('a[href="/join"]')).toHaveLength(1);
    expect(archive('.intro a[href="/join"]').text()).toBe("Request to join the WhatsApp group");
    expect(archive(".intro").text()).toContain("projects they’ve shipped");
    expect(archive(".intro").text()).toContain("Anyone can search this public resource index");
    const $ = load(renderJoin());
    expect($("form").attr("method")).toBe("post");
    expect($("form").attr("action")).toBe("/join");
    expect($("form label").map((_, label) => $(label).text()).get()).toEqual(["Name", "WhatsApp number", "Background"]);
    for (const field of ["name", "phone", "background"]) {
      expect($(`label[for="${field}"]`).length).toBe(1);
      expect($(`#${field}`).is("[required]")).toBe(true);
    }
    expect($("#phone").attr("autocomplete")).toBe("tel");
    expect($("input[name=website]").closest("[hidden][inert]").length).toBe(1);
  });
  it("escapes submitted values and announces corrections on their fields", () => {
    const values = {name:"<A & B>", phone:"1", background:"</textarea><script>private</script>"};
    const $ = load(renderJoin({ values, errors:{phone:"Include your country code.",background:"Add more detail."},message:"Check the highlighted fields." }));
    expect($("#name").val()).toBe(values.name);
    expect($("#background").val()).toBe(values.background);
    expect($("script").text()).not.toContain("private");
    expect($("[autofocus]").attr("id")).toBe("phone");
    expect($("#phone").attr("aria-invalid")).toBe("true");
    expect($("#phone").attr("aria-describedby")).toBe("phone-hint phone-error");
    expect($("#phone-error").text()).toBe("Include your country code.");
    expect($('[role="alert"]').text()).toBe("Check the highlighted fields.");
  });
  it("shows a private receipt without echoing any submitted values", () => {
    const $ = load(renderJoin({success:true,values:{name:"Test Applicant",phone:"+12025550146",background:"Private background."}}));
    expect($("h1").text()).toBe("Request received");
    expect($("main a[href='/']").length).toBe(1);
    expect($.html()).not.toMatch(/Test Applicant|12025550146|Private background/);
    expect($("form").length).toBe(0);
  });
});
