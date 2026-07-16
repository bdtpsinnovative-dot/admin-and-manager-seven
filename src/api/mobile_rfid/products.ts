import { NextRequest, NextResponse } from "next/server";
import { MobileRfidService } from "./service";
import { handleError } from "./utils";

export const ProductsController = {
  async getProducts(req: NextRequest, user: any) {
    try {
      const orParam = req.nextUrl.searchParams.get("or");
      if (orParam) {
        return await ProductsController.searchProduct(req, user);
      }

      const idParam = req.nextUrl.searchParams.get("id");
      if (idParam) {
        if (idParam.startsWith("in.")) {
          return await ProductsController.syncProducts(req, user);
        } else if (idParam.startsWith("eq.")) {
          return await ProductsController.getProductById(req, user);
        }
      }

      // Handle paging request
      const offset = Number(req.nextUrl.searchParams.get("offset") || "0");
      const limit = Number(req.nextUrl.searchParams.get("limit") || "500");

      const { data, count } = await MobileRfidService.fetchAllProducts(offset, limit);
      
      const response = NextResponse.json(data);
      if (count !== null) {
        response.headers.set("Content-Range", `${offset}-${offset + data.length - 1}/${count}`);
        // Expose headers for client reading
        response.headers.set("Access-Control-Expose-Headers", "Content-Range");
      }
      return response;
    } catch (err) {
      return handleError(err);
    }
  },

  async searchProduct(req: NextRequest, user: any) {
    try {
      const orParam = req.nextUrl.searchParams.get("or") || "";
      let code = "";
      const match = orParam.match(/barcode\.eq\.([^,)]+)/);
      if (match) {
        code = match[1];
      } else {
        const match2 = orParam.match(/sku\.eq\.([^,)]+)/);
        if (match2) code = match2[1];
      }

      if (!code) {
        const barcodeParam = req.nextUrl.searchParams.get("barcode") || "";
        code = barcodeParam.replace("eq.", "");
      }

      const data = await MobileRfidService.fetchByBarcodeOrSku(code);
      return NextResponse.json(data ? [data] : []);
    } catch (err) {
      return handleError(err);
    }
  },

  async syncProducts(req: NextRequest, user: any) {
    try {
      const idParam = req.nextUrl.searchParams.get("id") || "";
      const match = idParam.match(/in\.\(([^)]+)\)/);
      if (!match) return NextResponse.json([]);
      const ids = match[1].split(",").map(Number);
      
      const data = await MobileRfidService.fetchProductsMap(ids);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },

  async getProductById(req: NextRequest, user: any) {
    try {
      const idParam = req.nextUrl.searchParams.get("id") || "";
      const productId = Number(idParam.replace("eq.", ""));
      if (isNaN(productId)) return NextResponse.json([]);
      
      const data = await MobileRfidService.fetchProductsMap([productId]);
      return NextResponse.json(data);
    } catch (err) {
      return handleError(err);
    }
  },
};
