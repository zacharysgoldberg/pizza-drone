from fastapi import APIRouter, Request, Depends, Form
from .auth import get_current_user
from fastapi.responses import HTMLResponse
from models import Order
from utils.schemas import OrderBase, Orders
import requests
from commands.gps import coords_by_address, tsp_path
import csv
from . import templates
import json
# import pandas as pd


router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    responses={401: {"order": "Not found"}}
)


@router.get('/')
async def order_page(request: Request):
    return templates.TemplateResponse('index.html', {'request': request})


@router.post('/add-order', response_model=Orders)
async def add_order(request: Request, orders: Orders):
    # print(orders)
    for order in orders.orders:
        order_found = Order.find(Order.coords << order.coords).all()
        if not order_found:
            new_order = Order(
                input_type=order.inputType,
                order_date=order.date[:10],
                order_time=order.time,
                coords=order.coords,
            )
            new_order.save()
            new_order.expire(120)

    return orders


@ router.delete('/delete-orders/{pk}', response_class=HTMLResponse)
async def delete_order(request: Request, pk: str):
    pks = Order.all_pks()
    Order.delete(pk)
    return


# [Request to optimize path for orders/addresses]
@ router.get('/find-path')
async def find_path():
    # # [For CSV]
    # with open("api/routers/orders.csv", "r") as file:
    #     reader = csv.DictReader(file)
    #     # header = next(reader)
    #     addresses = [row['address'] for row in reader]

    # [For redis]
    pks = Order.all_pks()
    orders = [order for order in pks]
    # addresses = [Order.get(pk).address for pk in orders]
    # coords = [coords_by_address(order) for order in addresses]
    coords = [Order.get(pk).coords for pk in orders]
    optimal_path = tsp_path(coords)

    return {'orders': orders, 'path': optimal_path}

# [Request to get the next order upon successful authorization]


@ router.get('/next-order/{pk}')
async def next_order(request: Request, pk: str):
    # user = await get_current_user(request)
    # if user is None:
    #     response = requests.post("http://localhost:8000/auth/token",
    #                              data={"username": "ExampleUser", "password": "test1234!"})
    #     print(response.text)

    # [Returning next order based on order id]
    next_order = Order.get(pk)
    if next_order:
        print(next_order)
        return next_order
    return False

# [To update order delivery to True]


@ router.post('/deliver-order/{pk}')
async def deliver_order(request: Request, pk: str):
    # user = await get_current_user(request)
    # if user is None:
    #     response = request.post("http://localhost:8000/auth/token",
    #                             data={"username": "ExampleUser", "password": "test1234!"})
    # print(response.text)

    order = Order.get(pk)
    if order:
        order.status = 'completed'
        order.save()
        return order
    return False
