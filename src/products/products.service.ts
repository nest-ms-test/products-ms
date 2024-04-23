import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common/dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({ data: createProductDto });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;

    const totalRows = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(totalRows / limit);
    const producst = await this.product.findMany({
      where: { available: true },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: producst,
      meta: {
        page,
        totalRows,
        lastPage,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({
      where: { id, available: true },
    });

    if (!product) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Product with ID ${id} not found`,
      });
    }

    return product;
  }

  async update(updateProductDto: UpdateProductDto) {
    const { id, ...data } = updateProductDto;
    try {
      return await this.product.update({
        where: { id },
        data: data,
      });
    } catch (error) {
      this.handleError(error.code);
    }
  }

  async remove(id: number) {
    try {
      // return await this.product.delete({ where: { id } });
      return await this.product.update({
        where: { id },
        data: { available: false },
      });
    } catch (error) {
      this.handleError(error.code);
    }
  }

  async validateProducts(ids: number[]) {
    const idsPurged = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: { id: { in: idsPurged }, available: true },
    });

    if (products.length !== idsPurged.length) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: `One or more products not found`,
      });
    }

    return products;
  }

  private handleError(errorCode: string) {
    if (errorCode === 'P2025') {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Product not found`,
      });
    }

    throw new RpcException({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `Internal server error`,
    });
  }
}
